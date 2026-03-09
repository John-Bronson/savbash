-- ============================================================
-- SavBash Initial Schema
-- ============================================================

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table profiles (
	id uuid primary key references auth.users on delete cascade,
	christian_name text not null,
	bash_name text,
	email text,
	role text not null default 'user' check (role in ('user', 'moderator', 'admin')),
	avatar_url text,
	avatar_emoji text,
	subscribed_to_emails boolean not null default true,
	notify_on_mention boolean not null default true,
	created_at timestamptz not null default now()
);

alter table profiles add constraint profiles_bash_name_unique unique (bash_name);

-- ============================================================
-- 2. RIDES
-- ============================================================
create table rides (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	description text,
	ride_date timestamptz not null,
	meeting_spot_name text not null,
	meeting_spot_lat numeric,
	meeting_spot_lng numeric,
	image_url text,
	created_by uuid not null references profiles on delete cascade,
	created_at timestamptz not null default now(),
	updated_at timestamptz,
	updated_by uuid references profiles on delete set null
);

-- ============================================================
-- 3. RIDE HARES
-- ============================================================
create table ride_hares (
	id uuid primary key default gen_random_uuid(),
	ride_id uuid not null references rides on delete cascade,
	user_id uuid references profiles on delete set null,
	name text,
	created_at timestamptz not null default now(),
	constraint ride_hares_must_have_identity check (user_id is not null or name is not null)
);

-- ============================================================
-- 4. RIDE PHOTOS
-- ============================================================
create table ride_photos (
	id uuid primary key default gen_random_uuid(),
	ride_id uuid not null references rides on delete cascade,
	user_id uuid not null references profiles on delete cascade,
	photo_url text not null,
	caption text,
	created_at timestamptz not null default now()
);

-- ============================================================
-- 5. RSVPS
-- ============================================================
create table rsvps (
	id uuid primary key default gen_random_uuid(),
	ride_id uuid not null references rides on delete cascade,
	user_id uuid not null references profiles on delete cascade,
	status text not null check (status in ('going', 'maybe', 'not_going')),
	created_at timestamptz not null default now(),
	constraint rsvps_one_per_user_per_ride unique (ride_id, user_id)
);

-- ============================================================
-- 6. COMMENTS
-- ============================================================
create table comments (
	id uuid primary key default gen_random_uuid(),
	ride_id uuid not null references rides on delete cascade,
	user_id uuid not null references profiles on delete cascade,
	body text not null,
	is_deleted boolean not null default false,
	deleted_at timestamptz,
	deleted_by uuid references profiles on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz,
	updated_by uuid references profiles on delete set null
);

-- ============================================================
-- 7. REACTIONS
-- ============================================================
create table reactions (
	id uuid primary key default gen_random_uuid(),
	comment_id uuid not null references comments on delete cascade,
	user_id uuid not null references profiles on delete cascade,
	emoji text not null,
	created_at timestamptz not null default now(),
	constraint reactions_one_per_user_per_comment unique (comment_id, user_id)
);

-- ============================================================
-- 8. MENTIONS
-- ============================================================
create table mentions (
	id uuid primary key default gen_random_uuid(),
	comment_id uuid not null references comments on delete cascade,
	mentioned_user_id uuid not null references profiles on delete cascade,
	ride_id uuid not null references rides on delete cascade,
	is_read boolean not null default false,
	created_at timestamptz not null default now(),
	constraint mentions_one_per_user_per_comment unique (comment_id, mentioned_user_id)
);

-- ============================================================
-- 9. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
	insert into public.profiles (id, christian_name, email)
	values (
		new.id,
		coalesce(new.raw_user_meta_data ->> 'christian_name', ''),
		new.email
	);
	return new;
end;
$$;

create or replace trigger on_auth_user_created
	after insert on auth.users
	for each row execute function public.handle_new_user();

-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================

-- Helper function to get the current user's role
create or replace function public.current_user_role()
returns text
language sql
stable
security definer set search_path = ''
as $$
	select coalesce(
		(select role from public.profiles where id = auth.uid()),
		'user'
	);
$$;

-- Helper function to check if the current user is a hare for a given ride
create or replace function public.is_hare_for_ride(p_ride_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
	select exists (
		select 1 from public.ride_hares
		where ride_id = p_ride_id and user_id = auth.uid()
	);
$$;

-- ---- PROFILES ----
alter table profiles enable row level security;

create policy "Anyone can view profiles"
	on profiles for select
	using (true);

create policy "Users can update own profile"
	on profiles for update
	using (auth.uid() = id);

create policy "Moderators can update any profile"
	on profiles for update
	using (current_user_role() in ('moderator', 'admin'));

-- ---- RIDES ----
alter table rides enable row level security;

create policy "Anyone can view rides"
	on rides for select
	using (true);

create policy "Authenticated users can create rides"
	on rides for insert
	with check (auth.uid() = created_by);

create policy "Creator or hare or mod can update rides"
	on rides for update
	using (
		auth.uid() = created_by
		or is_hare_for_ride(id)
		or current_user_role() in ('moderator', 'admin')
	);

create policy "Creator or hare or mod can delete rides"
	on rides for delete
	using (
		auth.uid() = created_by
		or is_hare_for_ride(id)
		or current_user_role() in ('moderator', 'admin')
	);

-- ---- RIDE HARES ----
alter table ride_hares enable row level security;

create policy "Anyone can view ride hares"
	on ride_hares for select
	using (true);

create policy "Ride creator or mod can insert hares"
	on ride_hares for insert
	with check (
		exists (select 1 from rides where id = ride_id and created_by = auth.uid())
		or current_user_role() in ('moderator', 'admin')
	);

create policy "Ride creator or mod can update hares"
	on ride_hares for update
	using (
		exists (select 1 from rides where id = ride_id and created_by = auth.uid())
		or current_user_role() in ('moderator', 'admin')
	);

create policy "Ride creator or mod can delete hares"
	on ride_hares for delete
	using (
		exists (select 1 from rides where id = ride_id and created_by = auth.uid())
		or current_user_role() in ('moderator', 'admin')
	);

-- ---- RIDE PHOTOS ----
alter table ride_photos enable row level security;

create policy "Anyone can view ride photos"
	on ride_photos for select
	using (true);

create policy "Authenticated users can upload photos"
	on ride_photos for insert
	with check (auth.uid() = user_id);

create policy "Uploader or mod can delete photos"
	on ride_photos for delete
	using (
		auth.uid() = user_id
		or current_user_role() in ('moderator', 'admin')
	);

-- ---- RSVPS ----
alter table rsvps enable row level security;

create policy "Anyone can view rsvps"
	on rsvps for select
	using (true);

create policy "Authenticated users can insert own rsvp"
	on rsvps for insert
	with check (auth.uid() = user_id);

create policy "Users can update own rsvp"
	on rsvps for update
	using (auth.uid() = user_id);

create policy "User or admin can delete rsvp"
	on rsvps for delete
	using (
		auth.uid() = user_id
		or current_user_role() = 'admin'
	);

-- ---- COMMENTS ----
alter table comments enable row level security;

create policy "Anyone can view comments"
	on comments for select
	using (true);

create policy "Authenticated users can insert comments"
	on comments for insert
	with check (auth.uid() = user_id);

create policy "Author or mod can update comments"
	on comments for update
	using (
		auth.uid() = user_id
		or current_user_role() in ('moderator', 'admin')
	);

-- No hard delete policy — comments are soft-deleted via update
-- (setting is_deleted = true, deleted_at, deleted_by)

-- ---- REACTIONS ----
alter table reactions enable row level security;

create policy "Anyone can view reactions"
	on reactions for select
	using (true);

create policy "Authenticated users can insert own reaction"
	on reactions for insert
	with check (auth.uid() = user_id);

create policy "Users can update own reaction"
	on reactions for update
	using (auth.uid() = user_id);

create policy "Users can delete own reaction"
	on reactions for delete
	using (auth.uid() = user_id);

-- ---- MENTIONS ----
alter table mentions enable row level security;

create policy "Users can view own mentions"
	on mentions for select
	using (auth.uid() = mentioned_user_id);

create policy "Users can update own mentions"
	on mentions for update
	using (auth.uid() = mentioned_user_id)
	with check (auth.uid() = mentioned_user_id);

-- Mentions are inserted server-side only (via service role key),
-- so no insert policy is needed for regular users.

-- ============================================================
-- 11. INDEXES
-- ============================================================
create index idx_rides_created_by on rides (created_by);
create index idx_rides_ride_date on rides (ride_date);
create index idx_ride_hares_ride_id on ride_hares (ride_id);
create index idx_ride_photos_ride_id on ride_photos (ride_id);
create index idx_rsvps_ride_id on rsvps (ride_id);
create index idx_rsvps_user_id on rsvps (user_id);
create index idx_comments_ride_id on comments (ride_id);
create index idx_reactions_comment_id on reactions (comment_id);
create index idx_mentions_comment_id on mentions (comment_id);
create index idx_mentions_mentioned_user_id on mentions (mentioned_user_id);
create index idx_mentions_ride_id on mentions (ride_id);

-- ============================================================
-- 12. STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
values
	('avatars', 'avatars', true),
	('ride-images', 'ride-images', true),
	('ride-photos', 'ride-photos', true);

-- Avatars: anyone can read, users can upload to their own path
create policy "Anyone can view avatars"
	on storage.objects for select
	using (bucket_id = 'avatars');

create policy "Users can upload own avatar"
	on storage.objects for insert
	with check (
		bucket_id = 'avatars'
		and (storage.foldername(name))[1] = auth.uid()::text
	);

create policy "Users can update own avatar"
	on storage.objects for update
	using (
		bucket_id = 'avatars'
		and (storage.foldername(name))[1] = auth.uid()::text
	);

-- Ride images: anyone can read, authenticated users can upload
create policy "Anyone can view ride images"
	on storage.objects for select
	using (bucket_id = 'ride-images');

create policy "Authenticated users can upload ride images"
	on storage.objects for insert
	with check (
		bucket_id = 'ride-images'
		and auth.uid() is not null
	);

-- Ride photos: anyone can read, authenticated users can upload
create policy "Anyone can view ride photos"
	on storage.objects for select
	using (bucket_id = 'ride-photos');

create policy "Authenticated users can upload ride photos"
	on storage.objects for insert
	with check (
		bucket_id = 'ride-photos'
		and auth.uid() is not null
	);

create policy "Uploader or mod can delete ride photos"
	on storage.objects for delete
	using (
		bucket_id = 'ride-photos'
		and (
			owner = auth.uid()
			or public.current_user_role() in ('moderator', 'admin')
		)
	);
