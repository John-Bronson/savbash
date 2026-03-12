-- Fix: mentions insert was silently failing because there was no INSERT policy.
-- The comment code uses the user's authenticated client, not the service role key.
create policy "Approved users can insert mentions"
  on mentions for insert
  with check (current_user_role() in ('user', 'moderator', 'admin'));
