-- Trigger to protect role changes at DB level (defense-in-depth)
-- Rules:
--   role unchanged → allow
--   pending → user → allow if requester is user/moderator/admin
--   all other role changes → allow only if requester is admin
create or replace function check_role_change()
returns trigger as $$
declare
  requester_role text;
begin
  -- If role hasn't changed, allow
  if OLD.role = NEW.role then
    return NEW;
  end if;

  -- Get the role of the user making the request
  select role into requester_role
  from profiles
  where id = auth.uid();

  -- pending → user: any approved user can do this
  if OLD.role = 'pending' and NEW.role = 'user' then
    if requester_role in ('user', 'moderator', 'admin') then
      return NEW;
    end if;
    raise exception 'Only approved users can approve pending members';
  end if;

  -- All other role changes: admin only
  if requester_role = 'admin' then
    return NEW;
  end if;

  raise exception 'Only admins can change user roles';
end;
$$ language plpgsql security definer;

create trigger protect_role_changes
  before update on profiles
  for each row
  execute function check_role_change();
