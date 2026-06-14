-- Dynamic cron job configuration and execution history.

create table if not exists public.cron_jobs (
  id                  uuid primary key default gen_random_uuid(),
  key                 text not null unique,
  name                text not null,
  description         text,
  provider            text not null,
  task_key            text not null,
  schedule            text not null,
  timezone            text not null default 'UTC',
  enabled             boolean not null default false,
  no_overlap          boolean not null default true,
  max_runtime_seconds integer not null default 900,
  config              jsonb not null default '{}'::jsonb,
  lock_owner          text,
  locked_until        timestamptz,
  last_run_at         timestamptz,
  next_run_at         timestamptz,
  last_status         text,
  last_error          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint cron_jobs_key_not_blank check (length(trim(key)) > 0),
  constraint cron_jobs_name_not_blank check (length(trim(name)) > 0),
  constraint cron_jobs_task_key_not_blank check (length(trim(task_key)) > 0),
  constraint cron_jobs_schedule_not_blank check (length(trim(schedule)) > 0),
  constraint cron_jobs_provider_valid check (provider in ('odoo', 'supabase', 'internal')),
  constraint cron_jobs_last_status_valid check (
    last_status is null or last_status in ('running', 'success', 'failed', 'skipped', 'timeout')
  ),
  constraint cron_jobs_max_runtime_positive check (max_runtime_seconds > 0)
);

create table if not exists public.cron_job_runs (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.cron_jobs(id) on delete cascade,
  status        text not null default 'running',
  triggered_by  text not null default 'schedule',
  worker_id     text not null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  duration_ms   integer,
  error_message text,
  metadata      jsonb not null default '{}'::jsonb,
  constraint cron_job_runs_status_valid check (
    status in ('running', 'success', 'failed', 'skipped', 'timeout')
  ),
  constraint cron_job_runs_trigger_valid check (
    triggered_by in ('schedule', 'manual', 'startup', 'system')
  ),
  constraint cron_job_runs_duration_non_negative check (
    duration_ms is null or duration_ms >= 0
  )
);

create index if not exists idx_cron_jobs_enabled
  on public.cron_jobs(enabled);

create index if not exists idx_cron_jobs_task_key
  on public.cron_jobs(task_key);

create index if not exists idx_cron_jobs_locked_until
  on public.cron_jobs(locked_until)
  where locked_until is not null;

create index if not exists idx_cron_job_runs_job_id_started_at
  on public.cron_job_runs(job_id, started_at desc);

create index if not exists idx_cron_job_runs_status
  on public.cron_job_runs(status);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_cron_jobs_updated_at on public.cron_jobs;
create trigger touch_cron_jobs_updated_at
  before update on public.cron_jobs
  for each row execute function public.touch_updated_at();

create or replace function public.claim_cron_job(
  p_job_id uuid,
  p_worker_id text
)
returns public.cron_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_job public.cron_jobs;
begin
  update public.cron_jobs
  set
    lock_owner = p_worker_id,
    locked_until = now() + make_interval(secs => max_runtime_seconds),
    last_status = 'running',
    last_error = null
  where id = p_job_id
    and enabled = true
    and (locked_until is null or locked_until < now())
  returning * into claimed_job;

  return claimed_job;
end;
$$;

alter table public.cron_jobs enable row level security;
alter table public.cron_job_runs enable row level security;
