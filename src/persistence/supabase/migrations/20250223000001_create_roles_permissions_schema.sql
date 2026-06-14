-- Roles and permissions schema for Leasing Pro
-- Run in Supabase SQL Editor or via: supabase db push

-- Roles table (admin, cliente)
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

-- Permissions table (master list of permission slugs)
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text
);

-- Role-Permission N:M
create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Companies: Odoo partner records associated with user accounts
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  odoo_partner_id integer not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profiles: one per auth user, links to role and optionally a company
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  company_id uuid references public.companies(id) on delete set null,
  username varchar(255),
  phone varchar(10),
  updated_at timestamptz not null default now()
);

-- RLS: enable
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.companies enable row level security;
alter table public.profiles enable row level security;

-- ─── System tables: SELECT only ─────────────────────────────────────────────
-- Authenticated users need to read these tables to resolve their own
-- role name and permission slugs when loading a session.
-- All writes (create/update/delete roles, permissions, role_permissions)
-- are performed via the service role client and bypass RLS entirely.

create policy "roles_select_authenticated"
  on public.roles for select
  to authenticated
  using (true);

create policy "permissions_select_authenticated"
  on public.permissions for select
  to authenticated
  using (true);

create policy "role_permissions_select_authenticated"
  on public.role_permissions for select
  to authenticated
  using (true);

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- SELECT: each user can read their own profile row (resolves their role + permissions).
-- UPDATE: each user can update their own row (future self-service profile edits).
-- INSERT: not needed here — handled by handle_new_user() trigger (security definer)
--         and the service role client for admin-created users.
-- DELETE: not needed — handled by the service role client.
-- Admin reads/writes for any profile use the service role client (bypasses RLS).

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "companies_select_authenticated"
  on public.companies for select
  to authenticated
  using (true);

-- Index for profile lookups by user id (primary key already covers this; role_id and company_id for joins)
create index if not exists idx_profiles_role_id on public.profiles(role_id);
create index if not exists idx_profiles_company_id on public.profiles(company_id);
