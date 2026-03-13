-- site_settings table for admin-configurable settings
create table site_settings (
    key text primary key,
    value jsonb not null default '{}',
    updated_at timestamptz not null default now(),
    updated_by uuid references profiles(id) on delete set null
);

alter table site_settings enable row level security;

-- Any authenticated user can read (needed in auth callback for pending users)
create policy "Authenticated users can view settings"
    on site_settings for select
    using (auth.uid() is not null);

-- Only admins can modify
create policy "Admins can insert settings"
    on site_settings for insert
    with check (current_user_role() = 'admin');

create policy "Admins can update settings"
    on site_settings for update
    using (current_user_role() = 'admin');

-- Seed with empty notification list
insert into site_settings (key, value)
values ('signup_notification_emails', '[]'::jsonb);

-- Track whether signup notification was sent (prevents duplicate emails on re-login)
alter table profiles add column signup_notified boolean not null default false;
