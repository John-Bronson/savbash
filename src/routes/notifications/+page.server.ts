import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login')

	const { data: mentions } = await locals.supabase
		.from('mentions')
		.select(`
			*,
			comment:comments!comment_id(body, user_id, author:profiles!user_id(christian_name, bash_name, avatar_url, avatar_emoji)),
			ride:rides!ride_id(id, title)
		`)
		.eq('mentioned_user_id', locals.user.id)
		.order('created_at', { ascending: false })
		.limit(50)

	return { mentions: mentions ?? [] }
}

export const actions: Actions = {
	markAllRead: async ({ locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in' })

		await locals.supabase
			.from('mentions')
			.update({ is_read: true })
			.eq('mentioned_user_id', locals.user.id)
			.eq('is_read', false)

		return { success: true }
	}
}
