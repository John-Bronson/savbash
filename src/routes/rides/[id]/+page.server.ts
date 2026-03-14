import { error, fail } from '@sveltejs/kit';
import { sendMentionNotification } from '$lib/email';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { data: ride } = await locals.supabase
		.from('rides')
		.select(
			`
			*,
			creator:profiles!created_by(christian_name, bash_name, avatar_url, avatar_emoji),
			editor:profiles!updated_by(christian_name, bash_name),
			ride_hares(*, hare_profile:profiles!user_id(christian_name, bash_name, avatar_url, avatar_emoji)),
			rsvps(id, user_id, status, rsvp_profile:profiles!user_id(christian_name, bash_name, avatar_url, avatar_emoji))
		`
		)
		.eq('id', params.id)
		.single();

	if (!ride) error(404, 'Ride not found');

	// Fetch photos
	const { data: photos } = await locals.supabase
		.from('ride_photos')
		.select('*, uploader:profiles!user_id(christian_name, bash_name)')
		.eq('ride_id', params.id)
		.order('created_at', { ascending: true });

	// Fetch comments with profiles and reactions
	const { data: comments } = await locals.supabase
		.from('comments')
		.select(
			`
			*,
			author:profiles!user_id(christian_name, bash_name, avatar_url, avatar_emoji),
			reactions(id, user_id, emoji)
		`
		)
		.eq('ride_id', params.id)
		.order('created_at', { ascending: true });

	// Mark mentions as read when visiting the ride page
	if (locals.user) {
		await locals.supabase
			.from('mentions')
			.update({ is_read: true })
			.eq('mentioned_user_id', locals.user.id)
			.eq('ride_id', params.id)
			.eq('is_read', false);
	}

	// Check permissions
	const isCreator = locals.user?.id === ride.created_by;
	const isHare = ride.ride_hares.some(
		(h: { user_id: string | null }) => h.user_id === locals.user?.id
	);
	const isMod = locals.profile && ['moderator', 'admin'].includes(locals.profile.role);
	const canEdit = isCreator || isHare || isMod;

	const currentRsvp = ride.rsvps.find((r: { user_id: string }) => r.user_id === locals.user?.id);

	// Fetch all member profiles for @mention autocomplete
	const { data: members } = await locals.supabase
		.from('profiles')
		.select('id, christian_name, bash_name')
		.neq('role', 'pending')
		.order('christian_name');

	return {
		ride,
		photos: photos ?? [],
		comments: comments ?? [],
		members: members ?? [],
		canEdit,
		isCreator,
		isHare,
		isMod: !!isMod,
		currentRsvpStatus: currentRsvp?.status ?? null
	};
};

export const actions: Actions = {
	rsvp: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in' });

		const formData = await request.formData();
		const status = formData.get('status') as string;

		if (!['going', 'maybe', 'not_going'].includes(status)) {
			return fail(400, { message: 'Invalid status' });
		}

		const { error: rsvpError } = await locals.supabase
			.from('rsvps')
			.upsert(
				{ ride_id: params.id, user_id: locals.user.id, status },
				{ onConflict: 'ride_id,user_id' }
			);

		if (rsvpError) return fail(500, { message: 'Failed to update RSVP' });
		return { success: true };
	},

	comment: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in' });

		const formData = await request.formData();
		const body = (formData.get('body') as string)?.trim();

		if (!body) return fail(400, { message: 'Comment cannot be empty' });

		// Insert comment
		const { data: comment, error: commentError } = await locals.supabase
			.from('comments')
			.insert({ ride_id: params.id, user_id: locals.user.id, body })
			.select('id')
			.single();

		if (commentError || !comment) return fail(500, { message: 'Failed to post comment' });

		// Read mention IDs passed from client (MentionInput hidden field)
		const mentionIdsRaw = formData.get('mention_ids') as string;
		let mentionIds: string[] = [];
		try {
			const parsed = JSON.parse(mentionIdsRaw || '[]');
			if (Array.isArray(parsed)) {
				mentionIds = parsed.filter((id): id is string => typeof id === 'string' && id.length > 0);
			}
		} catch {
			console.warn('Failed to parse mention_ids:', mentionIdsRaw);
		}
		console.log('Mention IDs from form:', mentionIds);

		if (mentionIds.length > 0) {
			const mentionRows: { comment_id: string; mentioned_user_id: string; ride_id: string }[] = [];
			const hasEveryone = mentionIds.includes('everyone');
			const userIds = mentionIds.filter((id) => id !== 'everyone');

			// Handle @everyone — expand to all RSVPed users
			if (hasEveryone) {
				const { data: rsvpUsers } = await locals.supabase
					.from('rsvps')
					.select('user_id')
					.eq('ride_id', params.id)
					.in('status', ['going', 'maybe']);

				if (rsvpUsers) {
					for (const rsvp of rsvpUsers) {
						if (rsvp.user_id !== locals.user.id) {
							mentionRows.push({
								comment_id: comment.id,
								mentioned_user_id: rsvp.user_id,
								ride_id: params.id
							});
						}
					}
				}
			}

			// Handle individual user mentions — IDs are already known
			for (const uid of userIds) {
				if (uid !== locals.user.id) {
					mentionRows.push({
						comment_id: comment.id,
						mentioned_user_id: uid,
						ride_id: params.id
					});
				}
			}

			// Deduplicate by mentioned_user_id
			const unique = mentionRows.filter(
				(row, i, arr) => arr.findIndex((r) => r.mentioned_user_id === row.mentioned_user_id) === i
			);

			if (unique.length > 0) {
				await locals.supabase.from('mentions').insert(unique);

				// Send mention notification emails (fire and forget)
				const commenterName =
					locals.profile?.bash_name || locals.profile?.christian_name || 'Someone';

				// Get the ride title
				const { data: ride } = await locals.supabase
					.from('rides')
					.select('title')
					.eq('id', params.id)
					.single();

				// Get mentioned users' emails and preferences
				const mentionedIds = unique.map((r) => r.mentioned_user_id);
				const { data: mentionedProfiles } = await locals.supabase
					.from('profiles')
					.select('id, email, notify_on_mention')
					.in('id', mentionedIds);

				if (mentionedProfiles && ride) {
					console.log('Processing mentions:', mentionedProfiles.map((p) => ({ id: p.id, notify: p.notify_on_mention, hasEmail: !!p.email })));
					for (const mp of mentionedProfiles) {
						if (mp.notify_on_mention && mp.email) {
							console.log('Sending mention email to:', mp.email);
							await sendMentionNotification({
								mentionedEmail: mp.email,
								mentionerName: commenterName,
								commentBody: body,
								rideTitle: ride.title,
								rideId: params.id,
								commentId: comment.id
							});
						}
					}
				} else {
					console.warn('No mentioned profiles or ride found:', { mentionedProfiles, ride });
				}
			}
		}

		return { commented: true };
	},

	deleteComment: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in' });

		const formData = await request.formData();
		const commentId = formData.get('comment_id') as string;

		const { error: deleteError } = await locals.supabase
			.from('comments')
			.update({
				is_deleted: true,
				deleted_at: new Date().toISOString(),
				deleted_by: locals.user.id
			})
			.eq('id', commentId);

		if (deleteError) return fail(500, { message: 'Failed to delete comment' });
		return { success: true };
	},

	react: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in' });

		const formData = await request.formData();
		const commentId = formData.get('comment_id') as string;
		const emoji = formData.get('emoji') as string;

		// Check if user already has this exact reaction
		const { data: existing } = await locals.supabase
			.from('reactions')
			.select('id, emoji')
			.eq('comment_id', commentId)
			.eq('user_id', locals.user.id)
			.single();

		if (existing) {
			if (existing.emoji === emoji) {
				// Same emoji — toggle off (delete)
				await locals.supabase.from('reactions').delete().eq('id', existing.id);
			} else {
				// Different emoji — replace
				await locals.supabase.from('reactions').update({ emoji }).eq('id', existing.id);
			}
		} else {
			// No existing reaction — insert
			await locals.supabase
				.from('reactions')
				.insert({ comment_id: commentId, user_id: locals.user.id, emoji });
		}

		return { success: true };
	},

	uploadPhoto: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in' });

		const formData = await request.formData();
		const photoUrl = (formData.get('photo_url') as string)?.trim();
		const caption = (formData.get('caption') as string)?.trim() || null;

		if (!photoUrl) return fail(400, { message: 'No photo provided' });

		const { error: insertError } = await locals.supabase.from('ride_photos').insert({
			ride_id: params.id,
			user_id: locals.user.id,
			photo_url: photoUrl,
			caption
		});

		if (insertError) return fail(500, { message: 'Failed to save photo' });
		return { photoUploaded: true };
	},

	deletePhoto: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in' });

		const formData = await request.formData();
		const photoId = formData.get('photo_id') as string;

		// Check ownership or mod status
		const { data: photo } = await locals.supabase
			.from('ride_photos')
			.select('user_id')
			.eq('id', photoId)
			.single();

		if (!photo) return fail(404, { message: 'Photo not found' });

		const isMod = locals.profile && ['moderator', 'admin'].includes(locals.profile.role);
		if (photo.user_id !== locals.user.id && !isMod) {
			return fail(403, { message: 'Not authorized' });
		}

		await locals.supabase.from('ride_photos').delete().eq('id', photoId);
		return { photoDeleted: true };
	},

	deleteRide: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { message: 'Not logged in' });

		const { error: deleteError } = await locals.supabase.from('rides').delete().eq('id', params.id);

		if (deleteError) return fail(500, { message: 'Failed to delete ride' });
		return { deleted: true };
	}
};
