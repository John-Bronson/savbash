-- ============================================================
-- Add 'pending' role for users who have signed up but not been approved
-- Pending users are completely locked out until approved by another member
-- ============================================================

-- Update the role check constraint to include 'pending'
alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check
	check (role in ('pending', 'user', 'moderator', 'admin'));

-- New signups default to 'pending' instead of 'user'
alter table profiles alter column role set default 'pending';

-- ---- Update RLS policies to lock out pending users ----

-- RIDES: pending users can't see anything
drop policy "Anyone can view rides" on rides;
create policy "Approved users can view rides"
	on rides for select
	using (current_user_role() in ('user', 'moderator', 'admin'));

drop policy "Authenticated users can create rides" on rides;
create policy "Approved users can create rides"
	on rides for insert
	with check (
		auth.uid() = created_by
		and current_user_role() in ('user', 'moderator', 'admin')
	);

-- RIDE HARES: pending users can't see
drop policy "Anyone can view ride hares" on ride_hares;
create policy "Approved users can view ride hares"
	on ride_hares for select
	using (current_user_role() in ('user', 'moderator', 'admin'));

-- RIDE PHOTOS: pending users can't see
drop policy "Anyone can view ride photos" on ride_photos;
create policy "Approved users can view ride photos"
	on ride_photos for select
	using (current_user_role() in ('user', 'moderator', 'admin'));

drop policy "Authenticated users can upload photos" on ride_photos;
create policy "Approved users can upload photos"
	on ride_photos for insert
	with check (
		auth.uid() = user_id
		and current_user_role() in ('user', 'moderator', 'admin')
	);

-- RSVPS: pending users can't see or RSVP
drop policy "Anyone can view rsvps" on rsvps;
create policy "Approved users can view rsvps"
	on rsvps for select
	using (current_user_role() in ('user', 'moderator', 'admin'));

drop policy "Authenticated users can insert own rsvp" on rsvps;
create policy "Approved users can insert own rsvp"
	on rsvps for insert
	with check (
		auth.uid() = user_id
		and current_user_role() in ('user', 'moderator', 'admin')
	);

-- COMMENTS: pending users can't see or comment
drop policy "Anyone can view comments" on comments;
create policy "Approved users can view comments"
	on comments for select
	using (current_user_role() in ('user', 'moderator', 'admin'));

drop policy "Authenticated users can insert comments" on comments;
create policy "Approved users can insert comments"
	on comments for insert
	with check (
		auth.uid() = user_id
		and current_user_role() in ('user', 'moderator', 'admin')
	);

-- REACTIONS: pending users can't see or react
drop policy "Anyone can view reactions" on reactions;
create policy "Approved users can view reactions"
	on reactions for select
	using (current_user_role() in ('user', 'moderator', 'admin'));

drop policy "Authenticated users can insert own reaction" on reactions;
create policy "Approved users can insert own reaction"
	on reactions for insert
	with check (
		auth.uid() = user_id
		and current_user_role() in ('user', 'moderator', 'admin')
	);

-- PROFILES: pending users can still see profiles (needed for the approval list)
-- and update their own profile (to set up their name/avatar while waiting)
-- No changes needed to existing profile policies.

-- MENTIONS: already scoped to mentioned_user_id, no change needed.
