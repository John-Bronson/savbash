import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user || !locals.profile) {
		redirect(303, '/login');
	}

	if (locals.profile.role !== 'admin') {
		error(403, 'Only admins can edit other profiles');
	}

	const { data: targetProfile } = await locals.supabase
		.from('profiles')
		.select('*')
		.eq('id', params.id)
		.single();

	if (!targetProfile) {
		error(404, 'Profile not found');
	}

	return { targetProfile, targetUserId: params.id };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		if (!locals.user || !locals.profile) return fail(401, { message: 'Not logged in' });
		if (locals.profile.role !== 'admin') return fail(403, { message: 'Not authorized' });

		const formData = await request.formData();
		const christianName = (formData.get('christian_name') as string)?.trim();
		const bashName = (formData.get('bash_name') as string)?.trim() || null;
		const avatarUrl = (formData.get('avatar_url') as string)?.trim() || null;
		const avatarEmoji = (formData.get('avatar_emoji') as string)?.trim() || null;
		const subscribedToEmails = formData.get('subscribed_to_emails') === 'on';
		const notifyOnMention = formData.get('notify_on_mention') === 'on';

		if (!christianName) {
			return fail(400, { message: 'Christian name is required' });
		}

		// Check bash_name uniqueness if provided (exclude the target user)
		if (bashName) {
			const { data: existing } = await locals.supabase
				.from('profiles')
				.select('id')
				.eq('bash_name', bashName)
				.neq('id', params.id)
				.single();

			if (existing) {
				return fail(400, { message: 'That bash name is already taken' });
			}
		}

		const { error: updateError } = await locals.supabase
			.from('profiles')
			.update({
				christian_name: christianName,
				bash_name: bashName,
				avatar_url: avatarUrl,
				avatar_emoji: avatarEmoji,
				subscribed_to_emails: subscribedToEmails,
				notify_on_mention: notifyOnMention
			})
			.eq('id', params.id);

		if (updateError) {
			return fail(500, { message: 'Something went wrong. Please try again.' });
		}

		return { success: true };
	}
};
