import { redirect } from '@sveltejs/kit';
import { sendSignupNotification } from '$lib/email';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');

	if (code) {
		const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);

		if (sessionData?.user) {
			const { data: profile } = await supabase
				.from('profiles')
				.select('christian_name, signup_notified')
				.eq('id', sessionData.user.id)
				.single();

			if (profile && !profile.christian_name && !profile.signup_notified) {
				// New signup — send notification to configured emails
				const { data: setting } = await supabase
					.from('site_settings')
					.select('value')
					.eq('key', 'signup_notification_emails')
					.single();

				const notifyEmails: string[] = Array.isArray(setting?.value)
					? (setting.value as string[])
					: [];

				if (notifyEmails.length > 0 && sessionData.user.email) {
					sendSignupNotification(sessionData.user.email, notifyEmails);
				}

				await supabase
					.from('profiles')
					.update({ signup_notified: true })
					.eq('id', sessionData.user.id);
			}
		}
	}

	redirect(303, '/rides');
};
