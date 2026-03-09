import { error, fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) redirect(303, '/login')

	const { data: ride } = await locals.supabase
		.from('rides')
		.select('*, ride_hares(*, profiles:user_id(christian_name, bash_name))')
		.eq('id', params.id)
		.single()

	if (!ride) error(404, 'Ride not found')

	// Check permissions
	const isCreator = locals.user.id === ride.created_by
	const isHare = ride.ride_hares.some(
		(h: { user_id: string | null }) => h.user_id === locals.user?.id
	)
	const isMod = locals.profile && ['moderator', 'admin'].includes(locals.profile.role)

	if (!isCreator && !isHare && !isMod) {
		error(403, 'Not authorized to edit this ride')
	}

	// Fetch profiles for hare picker
	const { data: profiles } = await locals.supabase
		.from('profiles')
		.select('id, christian_name, bash_name')
		.neq('role', 'pending')
		.order('christian_name')

	// Split ride_date into date and time for form inputs
	const d = new Date(ride.ride_date)
	const dateStr = d.toISOString().split('T')[0]
	const timeStr = d.toTimeString().slice(0, 5)

	return { ride, dateStr, timeStr, profiles: profiles ?? [] }
}

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in' })

		const formData = await request.formData()
		const title = (formData.get('title') as string)?.trim()
		const description = (formData.get('description') as string)?.trim() || null
		const rideDate = formData.get('ride_date') as string
		const rideTime = formData.get('ride_time') as string
		const meetingSpotName = (formData.get('meeting_spot_name') as string)?.trim()
		const meetingSpotLat = formData.get('meeting_spot_lat') as string
		const meetingSpotLng = formData.get('meeting_spot_lng') as string
		const imageUrl = (formData.get('image_url') as string)?.trim() || null
		const hare1Id = formData.get('hare1_id') as string
		const hare1Name = (formData.get('hare1_name') as string)?.trim()
		const hare2Id = formData.get('hare2_id') as string
		const hare2Name = (formData.get('hare2_name') as string)?.trim()

		if (!title) return fail(400, { message: 'Title is required' })
		if (!rideDate || !rideTime) return fail(400, { message: 'Date and time are required' })
		if (!meetingSpotName) return fail(400, { message: 'Meeting spot is required' })

		const rideDatetime = new Date(`${rideDate}T${rideTime}`).toISOString()

		// Update the ride
		const { error: updateError } = await locals.supabase
			.from('rides')
			.update({
				title,
				description,
				ride_date: rideDatetime,
				meeting_spot_name: meetingSpotName,
				meeting_spot_lat: meetingSpotLat ? parseFloat(meetingSpotLat) : null,
				meeting_spot_lng: meetingSpotLng ? parseFloat(meetingSpotLng) : null,
				image_url: imageUrl,
				updated_at: new Date().toISOString(),
				updated_by: locals.user.id
			})
			.eq('id', params.id)

		if (updateError) {
			return fail(500, { message: 'Failed to update ride' })
		}

		// Replace hares: delete existing, insert new
		await locals.supabase.from('ride_hares').delete().eq('ride_id', params.id)

		const hares: { ride_id: string; user_id: string | null; name: string | null }[] = []

		if (hare1Id) {
			hares.push({ ride_id: params.id, user_id: hare1Id, name: null })
		} else if (hare1Name) {
			hares.push({ ride_id: params.id, user_id: null, name: hare1Name })
		}

		if (hare2Id) {
			hares.push({ ride_id: params.id, user_id: hare2Id, name: null })
		} else if (hare2Name) {
			hares.push({ ride_id: params.id, user_id: null, name: hare2Name })
		}

		if (hares.length > 0) {
			await locals.supabase.from('ride_hares').insert(hares)
		}

		redirect(303, `/rides/${params.id}`)
	}
}
