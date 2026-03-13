import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.profile) {
		redirect(303, '/login');
	}

	if (locals.profile.role !== 'admin') {
		return fail(403, { message: 'Not authorized' }) as never;
	}

	const { data: setting } = await locals.supabase
		.from('site_settings')
		.select('value')
		.eq('key', 'signup_notification_emails')
		.single();

	const emails: string[] = Array.isArray(setting?.value) ? (setting.value as string[]) : [];

	return {
		notificationEmails: emails
	};
};

export const actions: Actions = {
	updateEmails: async ({ request, locals }) => {
		if (!locals.profile || locals.profile.role !== 'admin') {
			return fail(403, { message: 'Not authorized' });
		}

		const formData = await request.formData();
		const raw = (formData.get('emails') as string) || '';

		const emails = raw
			.split(/[,\n]+/)
			.map((e) => e.trim())
			.filter((e) => e.length > 0);

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const invalid = emails.filter((e) => !emailRegex.test(e));
		if (invalid.length > 0) {
			return fail(400, {
				message: `Invalid email address${invalid.length > 1 ? 'es' : ''}: ${invalid.join(', ')}`,
				emails: raw
			});
		}

		const { error } = await locals.supabase
			.from('site_settings')
			.upsert({
				key: 'signup_notification_emails',
				value: emails,
				updated_at: new Date().toISOString(),
				updated_by: locals.user!.id
			});

		if (error) {
			return fail(500, { message: 'Failed to save settings', emails: raw });
		}

		return { success: true };
	}
};
