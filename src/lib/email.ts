import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { PUBLIC_SITE_URL } from '$env/static/public';

function getResend() {
	return new Resend(env.RESEND_API_KEY);
}

const FROM = 'SavBash <admin@savbash.com>';

function formatDate(dateStr: string) {
	const d = new Date(dateStr);
	return d.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

function formatTime(dateStr: string) {
	const d = new Date(dateStr);
	return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function emailWrapper(content: string) {
	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="text-align:center;margin-bottom:24px">
<span style="font-size:20px;font-weight:bold;color:#f3f4f6">SavBash</span>
</div>
<div style="background:#1f2937;border-radius:12px;padding:24px;color:#d1d5db">
${content}
</div>
<div style="text-align:center;margin-top:24px;font-size:12px;color:#6b7280">
<a href="${PUBLIC_SITE_URL}/profile" style="color:#6b7280;text-decoration:underline">Email preferences</a>
</div>
</div>
</body>
</html>`;
}

interface RideEmailData {
	id: string;
	title: string;
	ride_date: string;
	meeting_spot_name: string;
	description: string | null;
	hares: string[];
}

export async function sendRideAnnouncement(ride: RideEmailData, subscribers: { email: string }[]) {
	if (!env.RESEND_API_KEY || subscribers.length === 0) return;

	const rideUrl = `${PUBLIC_SITE_URL}/rides/${ride.id}`;
	const hareText = ride.hares.length > 0 ? ride.hares.join(', ') : 'TBD';
	const descPreview = ride.description?.slice(0, 200) || '';

	const html = emailWrapper(`
<h2 style="margin:0 0 16px;color:#f3f4f6;font-size:20px">New Ride Posted!</h2>
<h3 style="margin:0 0 8px;color:#f3f4f6;font-size:18px">${escapeHtml(ride.title)}</h3>
<p style="margin:4px 0;color:#9ca3af;font-size:14px">
${formatDate(ride.ride_date)} at ${formatTime(ride.ride_date)}
</p>
<p style="margin:4px 0;color:#9ca3af;font-size:14px">
📍 ${escapeHtml(ride.meeting_spot_name)}
</p>
<p style="margin:4px 0;color:#9ca3af;font-size:14px">
🐇 Hare${ride.hares.length !== 1 ? 's' : ''}: ${escapeHtml(hareText)}
</p>
${descPreview ? `<p style="margin:16px 0 0;color:#d1d5db;font-size:14px">${escapeHtml(descPreview)}${ride.description && ride.description.length > 200 ? '...' : ''}</p>` : ''}
<div style="text-align:center;margin-top:24px">
<a href="${rideUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">View Ride</a>
</div>
`);

	const emails = subscribers.map((s) => s.email);

	// Resend batch API: send to all at once using BCC
	try {
		await getResend().emails.send({
			from: FROM,
			to: FROM,
			bcc: emails,
			subject: `New Ride: ${ride.title}`,
			html
		});
	} catch (err) {
		console.error('Failed to send ride announcement:', err);
	}
}

interface MentionEmailData {
	mentionedEmail: string;
	mentionerName: string;
	commentBody: string;
	rideTitle: string;
	rideId: string;
	commentId: string;
}

export async function sendMentionNotification(data: MentionEmailData) {
	if (!env.RESEND_API_KEY) return;

	const commentUrl = `${PUBLIC_SITE_URL}/rides/${data.rideId}#comment-${data.commentId}`;
	const preview = data.commentBody.slice(0, 200);

	const html = emailWrapper(`
<h2 style="margin:0 0 16px;color:#f3f4f6;font-size:18px">
${escapeHtml(data.mentionerName)} mentioned you
</h2>
<p style="margin:0 0 4px;color:#9ca3af;font-size:13px">
In <strong style="color:#d1d5db">${escapeHtml(data.rideTitle)}</strong>
</p>
<div style="background:#111827;border-radius:8px;padding:12px 16px;margin:16px 0;border-left:3px solid #3b82f6">
<p style="margin:0;color:#d1d5db;font-size:14px">${escapeHtml(preview)}${data.commentBody.length > 200 ? '...' : ''}</p>
</div>
<div style="text-align:center;margin-top:20px">
<a href="${commentUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View Comment</a>
</div>
`);

	try {
		await getResend().emails.send({
			from: FROM,
			to: data.mentionedEmail,
			subject: `${data.mentionerName} mentioned you in ${data.rideTitle}`,
			html
		});
	} catch (err) {
		console.error('Failed to send mention notification:', err);
	}
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
