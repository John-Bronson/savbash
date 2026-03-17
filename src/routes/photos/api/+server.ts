import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const cursor = url.searchParams.get('cursor') || undefined;
	const limit = 5;

	let query = locals.supabase
		.from('rides')
		.select(
			`
			id, title, ride_date,
			ride_photos(*, uploader:profiles!user_id(christian_name, bash_name), photo_reactions(id, user_id, emoji))
		`
		)
		.order('ride_date', { ascending: false })
		.limit(limit + 5);

	if (cursor) {
		query = query.lt('ride_date', cursor);
	}

	const { data: rides } = await query;

	if (!rides) return json({ rideGroups: [], nextCursor: null });

	const withPhotos = rides.filter((r) => r.ride_photos && r.ride_photos.length > 0);
	const rideGroups = withPhotos.slice(0, limit);
	const nextCursor =
		rideGroups.length === limit ? rideGroups[rideGroups.length - 1].ride_date : null;

	return json({ rideGroups, nextCursor });
};
