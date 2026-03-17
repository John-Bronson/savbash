import type { PageServerLoad } from './$types';

async function loadRidesWithPhotos(supabase: App.Locals['supabase'], cursor?: string, limit = 5) {
	let query = supabase
		.from('rides')
		.select(
			`
			id, title, ride_date,
			ride_photos(*, uploader:profiles!user_id(christian_name, bash_name), photo_reactions(id, user_id, emoji))
		`
		)
		.order('ride_date', { ascending: false })
		.limit(limit + 5); // over-fetch to ensure we get enough with photos

	if (cursor) {
		query = query.lt('ride_date', cursor);
	}

	const { data: rides } = await query;

	if (!rides) return { rideGroups: [], nextCursor: null };

	// Filter to rides that have photos
	const withPhotos = rides.filter((r) => r.ride_photos && r.ride_photos.length > 0);
	const rideGroups = withPhotos.slice(0, limit);
	const nextCursor =
		rideGroups.length === limit ? rideGroups[rideGroups.length - 1].ride_date : null;

	return { rideGroups, nextCursor };
}

export const load: PageServerLoad = async ({ locals }) => {
	const { rideGroups, nextCursor } = await loadRidesWithPhotos(locals.supabase);
	return { rideGroups, nextCursor };
};
