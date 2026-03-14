import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import type { Database } from '$lib/database.types';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		}
	);

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };

		return { session, user };
	};

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	// Fetch profile if logged in
	if (user) {
		const { data: profile } = await event.locals.supabase
			.from('profiles')
			.select('*')
			.eq('id', user.id)
			.single();
		event.locals.profile = profile;
	} else {
		event.locals.profile = null;
	}

	const path = event.url.pathname;

	// Routes that don't require auth
	const publicPaths = ['/login', '/auth/callback', '/about'];
	const isPublicPath = path === '/' || publicPaths.some((p) => path.startsWith(p));

	// Not logged in — redirect to login (unless already on a public path)
	if (!user && !isPublicPath) {
		redirect(303, '/login');
	}

	// Logged in but no christian_name — redirect to profile setup
	if (
		user &&
		event.locals.profile &&
		!event.locals.profile.christian_name &&
		path !== '/profile/setup'
	) {
		redirect(303, '/profile/setup');
	}

	// Logged in but pending — redirect to pending page (unless setting up profile)
	if (
		user &&
		event.locals.profile &&
		event.locals.profile.christian_name &&
		(event.locals.profile.role === 'pending' || event.locals.profile.role === 'disabled') &&
		path !== '/pending' &&
		path !== '/profile/setup' &&
		path !== '/profile' &&
		path !== '/' &&
		path !== '/about' &&
		!isPublicPath
	) {
		redirect(303, '/pending');
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
