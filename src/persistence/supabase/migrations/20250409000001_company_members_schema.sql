-- Company-level membership, permissions, and unit access schema.
-- Adds multi-tenant support: company admins can manage employees
-- with fine-grained screen and unit restrictions.

-- ─── company_roles: catalogue of roles within a company ────────────────────
create table if not exists public.company_roles (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

-- ─── company_members: links a profile to a company with a company role ─────
create table if not exists public.company_members (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  company_role_id uuid not null references public.company_roles(id),
  invited_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- One membership row per (user, company); users may belong to multiple companies.
  unique (profile_id, company_id)
);

-- ─── company_member_permissions: per-member permission grants ──────────────
create table if not exists public.company_member_permissions (
  company_member_id uuid not null references public.company_members(id) on delete cascade,
  permission_id     uuid not null references public.permissions(id) on delete cascade,
  granted_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  primary key (company_member_id, permission_id)
);

-- ─── company_member_units: per-member VIN access ───────────────────────────
create table if not exists public.company_member_units (
  id                uuid primary key default gen_random_uuid(),
  company_member_id uuid not null references public.company_members(id) on delete cascade,
  vin               text not null,
  assigned_by       uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  unique(company_member_id, vin)
);

-- ─── Indexes ───────────────────────────────────────────────────────────────
create index if not exists idx_company_members_company_id
  on public.company_members(company_id);
create index if not exists idx_company_members_profile_id
  on public.company_members(profile_id);
create index if not exists idx_company_member_permissions_member_id
  on public.company_member_permissions(company_member_id);
create index if not exists idx_company_member_units_member_id
  on public.company_member_units(company_member_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.company_roles enable row level security;
alter table public.company_members enable row level security;
alter table public.company_member_permissions enable row level security;
alter table public.company_member_units enable row level security;

-- company_roles: public catalogue, any authenticated user can read
create policy "company_roles_select_authenticated"
  on public.company_roles for select
  to authenticated
  using (true);

-- company_members: users can read their own membership
create policy "company_members_select_own"
  on public.company_members for select
  to authenticated
  using ((select auth.uid()) = profile_id);

-- company_member_permissions: users can read their own granted permissions
create policy "company_member_permissions_select_own"
  on public.company_member_permissions for select
  to authenticated
  using (
    company_member_id in (
      select id from public.company_members
      where profile_id = (select auth.uid())
    )
  );

-- company_member_units: users can read their own assigned units
create policy "company_member_units_select_own"
  on public.company_member_units for select
  to authenticated
  using (
    company_member_id in (
      select id from public.company_members
      where profile_id = (select auth.uid())
    )
  );

-- ─── Seed company roles ───────────────────────────────────────────────────
insert into public.company_roles (id, name, slug) values
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'Admin de Compañía', 'company_admin'),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'Empleado', 'company_employee')
on conflict (slug) do nothing;

-- ─── Backfill: legacy profiles.company_id → company_members ─────────────────
-- Seeds one company_employee row per profile that still had company_id set.
-- Does not add a sync trigger: multi-company users cannot map to a single
-- profiles.company_id; the app resolves the active company separately.
insert into public.company_members (company_id, profile_id, company_role_id)
select p.company_id, p.id, cr.id
from public.profiles p
join public.company_roles cr on cr.slug = 'company_employee'
where p.company_id is not null
on conflict (profile_id, company_id) do nothing;
