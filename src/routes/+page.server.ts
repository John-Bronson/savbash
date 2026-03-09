import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const now = new Date().toISOString();

	// Fetch upcoming rides with hares and RSVP counts
	const { data: upcomingRides } = await locals.supabase
		.from('rides')
		.select('*, ride_hares(*, profiles:user_id(christian_name, bash_name)), rsvps(status)')
		.gte('ride_date', now)
		.order('ride_date', { ascending: true });

	// Fetch past rides (last 10)
	const { data: pastRides } = await locals.supabase
		.from('rides')
		.select('*, ride_hares(*, profiles:user_id(christian_name, bash_name)), rsvps(status)')
		.lt('ride_date', now)
		.order('ride_date', { ascending: false })
		.limit(10);

	// Fetch pending users for approved members
	let pendingUsers: {
		id: string;
		christian_name: string;
		email: string | null;
		created_at: string;
	}[] = [];

	if (locals.profile && ['user', 'moderator', 'admin'].includes(locals.profile.role)) {
		const { data } = await locals.supabase
			.from('profiles')
			.select('id, christian_name, email, created_at')
			.eq('role', 'pending')
			.neq('christian_name', '')
			.order('created_at', { ascending: true });

		pendingUsers = data ?? [];
	}

	return {
		upcomingRides: upcomingRides ?? [],
		pastRides: pastRides ?? [],
		pendingUsers
	};
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		if (!locals.profile || !['user', 'moderator', 'admin'].includes(locals.profile.role)) {
			return fail(403, { message: 'Not authorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('user_id') as string;

		if (!userId) return fail(400, { message: 'Missing user ID' });

		const { error } = await locals.supabase
			.from('profiles')
			.update({ role: 'user' })
			.eq('id', userId)
			.eq('role', 'pending');

		if (error) {
			return fail(500, { message: 'Failed to approve user' });
		}

		return { success: true };
	}
};
