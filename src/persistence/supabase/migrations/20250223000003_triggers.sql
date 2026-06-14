-- Create profile with default role (invitado) when a new user signs up.
-- Populates username, phone, company_name from raw_user_meta_data when provided at signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  default_role_id uuid;
begin
  select id into default_role_id from public.roles where slug = 'invitado' limit 1;
  if default_role_id is null then
    raise exception 'Default role "invitado" not found. Run seed migration first.';
  end if;
  insert into public.profiles (id, role_id, username, phone)
  values (
    new.id,
    default_role_id,
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(left(new.raw_user_meta_data->>'phone', 10)), '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reassign profiles to the invitado role before a role is deleted,
-- preventing FK violations and ensuring no user is left without a role.
create or replace function public.reassign_profiles_before_role_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  fallback_id uuid;
begin
  select id into fallback_id from public.roles where slug = 'invitado' limit 1;
  if fallback_id is null then
    raise exception 'Rol de respaldo (invitado) no existe. No se puede eliminar el rol.';
  end if;
  update public.profiles
    set role_id = fallback_id, updated_at = now()
    where role_id = old.id;
  return old;
end;
$$;

drop trigger if exists before_delete_role_reassign_profiles on public.roles;
create trigger before_delete_role_reassign_profiles
  before delete on public.roles
  for each row execute function public.reassign_profiles_before_role_delete();


-- Prevent users from changing their own role_id (privilege escalation).
-- Only the service role (admin/backend) may update role_id on profiles.
-- Authenticated users can still update their own row for username, phone.
--
-- Why auth.role() instead of session_user or current_user:
-- - In Supabase + PostgREST, session_user is always 'authenticator' (the underlying
--   DB connection role), regardless of which API key was used. PostgREST switches the
--   effective role via SET LOCAL ROLE, which is reflected in current_user/auth.role().
-- - auth.role() reads current_setting('request.jwt.claims') set by PostgREST per
--   request, returning 'service_role' for the service key and 'authenticated' for
--   regular users. It is a session-level GUC so it is not affected by SECURITY DEFINER
--   context switches (e.g. when called from reassign_profiles_before_role_delete).
-- - When called outside PostgREST (e.g. direct psql), auth.role() returns NULL and the
--   condition evaluates to NULL (falsy), so the update is allowed — direct DB access
--   bypasses RLS/triggers by design.

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    new.role_id = old.role_id;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_profile_role_escalation();
