import { env } from '$env/dynamic/public';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	let unreadMentionCount = 0;

	if (locals.user) {
		const { count } = await locals.supabase
			.from('mentions')
			.select('*', { count: 'exact', head: true })
			.eq('mentioned_user_id', locals.user.id)
			.eq('is_read', false);

		unreadMentionCount = count ?? 0;
	}

	return {
		session: locals.session,
		user: locals.user,
		profile: locals.profile,
		unreadMentionCount,
		googleMapsApiKey: env.PUBLIC_GOOGLE_MAPS_API_KEY
	};
};
