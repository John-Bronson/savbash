import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login')
	return { profile: locals.profile }
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in', christianName: '', bashName: null })

		const formData = await request.formData()
		const christianName = (formData.get('christian_name') as string)?.trim()
		const bashName = (formData.get('bash_name') as string)?.trim() || null

		if (!christianName) {
			return fail(400, { message: 'Christian name is required', christianName: christianName ?? '', bashName })
		}

		// Check bash_name uniqueness if provided
		if (bashName) {
			const { data: existing } = await locals.supabase
				.from('profiles')
				.select('id')
				.eq('bash_name', bashName)
				.neq('id', locals.user.id)
				.single()

			if (existing) {
				return fail(400, {
					message: 'That bash name is already taken',
					christianName,
					bashName
				})
			}
		}

		const { error } = await locals.supabase
			.from('profiles')
			.update({
				christian_name: christianName,
				bash_name: bashName
			})
			.eq('id', locals.user.id)

		if (error) {
			return fail(500, {
				message: 'Something went wrong. Please try again.',
				christianName: christianName ?? '',
				bashName
			})
		}

		redirect(303, '/')
	}
}
