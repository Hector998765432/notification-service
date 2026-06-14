-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  odoo_partner_id integer NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.company_member_permissions (
  company_member_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  granted_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT company_member_permissions_pkey PRIMARY KEY (company_member_id, permission_id),
  CONSTRAINT company_member_permissions_company_member_id_fkey FOREIGN KEY (company_member_id) REFERENCES public.company_members(id),
  CONSTRAINT company_member_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id),
  CONSTRAINT company_member_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.company_member_units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_member_id uuid NOT NULL,
  vin text NOT NULL,
  assigned_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT company_member_units_pkey PRIMARY KEY (id),
  CONSTRAINT company_member_units_company_member_id_fkey FOREIGN KEY (company_member_id) REFERENCES public.company_members(id),
  CONSTRAINT company_member_units_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.company_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  company_role_id uuid NOT NULL,
  invited_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT company_members_pkey PRIMARY KEY (id),
  CONSTRAINT company_members_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT company_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT company_members_company_role_id_fkey FOREIGN KEY (company_role_id) REFERENCES public.company_roles(id),
  CONSTRAINT company_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.company_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  CONSTRAINT company_roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  role_id uuid NOT NULL,
  company_id uuid,
  username character varying,
  phone character varying,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  avatar_url character varying,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id)
);
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);