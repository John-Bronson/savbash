import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.profile) {
		redirect(303, '/login');
	}

	if (locals.profile.role === 'pending') {
		redirect(303, '/');
	}

	const { data: members } = await locals.supabase
		.from('profiles')
		.select('id, christian_name, bash_name, email, avatar_url, avatar_emoji, role, created_at')
		.neq('christian_name', '')
		.order('christian_name', { ascending: true });

	return {
		members: members ?? [],
		isAdmin: locals.profile.role === 'admin',
		currentUserId: locals.user.id
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
	},

	changeRole: async ({ request, locals }) => {
		if (!locals.profile || locals.profile.role !== 'admin') {
			return fail(403, { message: 'Only admins can change roles' });
		}

		const formData = await request.formData();
		const userId = formData.get('user_id') as string;
		const newRole = formData.get('new_role') as string;

		if (!userId) return fail(400, { message: 'Missing user ID' });
		if (!['user', 'moderator', 'admin'].includes(newRole)) {
			return fail(400, { message: 'Invalid role' });
		}

		if (userId === locals.user!.id) {
			return fail(400, { message: 'Cannot change your own role' });
		}

		const { error } = await locals.supabase
			.from('profiles')
			.update({ role: newRole })
			.eq('id', userId);

		if (error) {
			return fail(500, { message: 'Failed to change role' });
		}

		return { success: true };
	}
};
