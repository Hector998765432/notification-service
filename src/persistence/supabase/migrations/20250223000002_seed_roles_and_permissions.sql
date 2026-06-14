-- Seed roles
insert into public.roles (id, name, slug) values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'Admin', 'admin'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'Cliente', 'cliente'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'Invitado', 'invitado')
  ('a0000000-0000-4000-8000-000000000004'::uuid, 'Leasing Mobile', 'leasing-mobile')
on conflict (slug) do nothing;

-- Seed permissions (IDs stable for role_permissions seed)
insert into public.permissions (id, name, slug, description) values
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'Ver home', 'home.view', 'Ver overview / dashboard principal'),
  ('b0000000-0000-4000-8000-000000000002'::uuid, 'Ver roles', 'roles.view', 'Ver roles'),
  ('b0000000-0000-4000-8000-000000000003'::uuid, 'Ver flotillas', 'fleets.view', 'Ver flotillas'),
  ('b0000000-0000-4000-8000-000000000004'::uuid, 'Ver contratos', 'contracts.view', 'Ver contratos'),
  ('b0000000-0000-4000-8000-000000000005'::uuid, 'Ver Mi compañía', 'company.manage', 'Gestionar compañía'),
on conflict (slug) do nothing;

-- Admin: all permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.slug = 'admin'
on conflict (role_id, permission_id) do nothing;

-- Cliente: subset (dashboard)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.slug in (
  'dashboard.view', 'home.view'
)
where r.slug = 'cliente'
on conflict (role_id, permission_id) do nothing;

-- Invitado: subset (home)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.slug in (
  'home.view'
)
where r.slug = 'invitado'
on conflict (role_id, permission_id) do nothing;
