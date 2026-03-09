import { fail, redirect } from '@sveltejs/kit';
import { sendRideAnnouncement } from '$lib/email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login');

	// Fetch all approved profiles for the hare picker
	const { data: profiles } = await locals.supabase
		.from('profiles')
		.select('id, christian_name, bash_name')
		.neq('role', 'pending')
		.order('christian_name');

	return { profiles: profiles ?? [] };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in' });

		const formData = await request.formData();
		const title = (formData.get('title') as string)?.trim();
		const description = (formData.get('description') as string)?.trim() || null;
		const rideDate = formData.get('ride_date') as string;
		const rideTime = formData.get('ride_time') as string;
		const meetingSpotName = (formData.get('meeting_spot_name') as string)?.trim();
		const meetingSpotLat = formData.get('meeting_spot_lat') as string;
		const meetingSpotLng = formData.get('meeting_spot_lng') as string;
		const imageUrl = (formData.get('image_url') as string)?.trim() || null;
		const hare1Id = formData.get('hare1_id') as string;
		const hare1Name = (formData.get('hare1_name') as string)?.trim();
		const hare2Id = formData.get('hare2_id') as string;
		const hare2Name = (formData.get('hare2_name') as string)?.trim();

		if (!title) return fail(400, { message: 'Title is required' });
		if (!rideDate || !rideTime) return fail(400, { message: 'Date and time are required' });
		if (!meetingSpotName) return fail(400, { message: 'Meeting spot is required' });

		const rideDatetime = new Date(`${rideDate}T${rideTime}`).toISOString();

		// Insert the ride
		const { data: ride, error } = await locals.supabase
			.from('rides')
			.insert({
				title,
				description,
				ride_date: rideDatetime,
				meeting_spot_name: meetingSpotName,
				meeting_spot_lat: meetingSpotLat ? parseFloat(meetingSpotLat) : null,
				meeting_spot_lng: meetingSpotLng ? parseFloat(meetingSpotLng) : null,
				image_url: imageUrl,
				created_by: locals.user.id
			})
			.select('id')
			.single();

		if (error || !ride) {
			return fail(500, { message: 'Failed to create ride' });
		}

		// Insert hares
		const hares: { ride_id: string; user_id: string | null; name: string | null }[] = [];

		if (hare1Id) {
			hares.push({ ride_id: ride.id, user_id: hare1Id, name: null });
		} else if (hare1Name) {
			hares.push({ ride_id: ride.id, user_id: null, name: hare1Name });
		}

		if (hare2Id) {
			hares.push({ ride_id: ride.id, user_id: hare2Id, name: null });
		} else if (hare2Name) {
			hares.push({ ride_id: ride.id, user_id: null, name: hare2Name });
		}

		const hareNames: string[] = [];
		if (hares.length > 0) {
			await locals.supabase.from('ride_hares').insert(hares);
			// Resolve hare display names for the email
			for (const h of hares) {
				if (h.name) {
					hareNames.push(h.name);
				} else if (h.user_id) {
					const { data: hp } = await locals.supabase
						.from('profiles')
						.select('christian_name, bash_name')
						.eq('id', h.user_id)
						.single();
					if (hp) hareNames.push(hp.bash_name || hp.christian_name);
				}
			}
		}

		// Send ride announcement email (fire and forget — don't block the redirect)
		const { data: subscribers } = await locals.supabase
			.from('profiles')
			.select('email')
			.eq('subscribed_to_emails', true)
			.neq('role', 'pending');

		if (subscribers && subscribers.length > 0) {
			sendRideAnnouncement(
				{
					id: ride.id,
					title,
					ride_date: rideDatetime,
					meeting_spot_name: meetingSpotName,
					description,
					hares: hareNames
				},
				subscribers.filter((s: { email: string | null }) => s.email) as { email: string }[]
			);
		}

		redirect(303, `/rides/${ride.id}`);
	}
};
