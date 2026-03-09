import { error, fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: ride } = await locals.supabase
		.from('rides')
		.select(`
			*,
			creator:profiles!created_by(christian_name, bash_name, avatar_url, avatar_emoji),
			editor:profiles!updated_by(christian_name, bash_name),
			ride_hares(*, hare_profile:profiles!user_id(christian_name, bash_name, avatar_url, avatar_emoji)),
			rsvps(id, user_id, status, rsvp_profile:profiles!user_id(christian_name, bash_name, avatar_url, avatar_emoji))
		`)
		.eq('id', params.id)
		.single()

	if (!ride) error(404, 'Ride not found')

	// Check if current user is the creator or a hare
	const isCreator = locals.user?.id === ride.created_by
	const isHare = ride.ride_hares.some(
		(h: { user_id: string | null }) => h.user_id === locals.user?.id
	)
	const isMod = locals.profile && ['moderator', 'admin'].includes(locals.profile.role)
	const canEdit = isCreator || isHare || isMod

	// Get current user's RSVP
	const currentRsvp = ride.rsvps.find(
		(r: { user_id: string }) => r.user_id === locals.user?.id
	)

	return { ride, canEdit, currentRsvpStatus: currentRsvp?.status ?? null }
}

export const actions: Actions = {
	rsvp: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in' })

		const formData = await request.formData()
		const status = formData.get('status') as string

		if (!['going', 'maybe', 'not_going'].includes(status)) {
			return fail(400, { message: 'Invalid status' })
		}

		const { error: rsvpError } = await locals.supabase
			.from('rsvps')
			.upsert(
				{
					ride_id: params.id,
					user_id: locals.user.id,
					status
				},
				{ onConflict: 'ride_id,user_id' }
			)

		if (rsvpError) {
			return fail(500, { message: 'Failed to update RSVP' })
		}

		return { success: true }
	},

	deleteRide: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in' })

		const { error: deleteError } = await locals.supabase
			.from('rides')
			.delete()
			.eq('id', params.id)

		if (deleteError) {
			return fail(500, { message: 'Failed to delete ride' })
		}

		return { deleted: true }
	}
}
