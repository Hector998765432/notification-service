---
name: add-cron-handler
description: >-
  Adds a new dynamic cron job handler in notification-service: TypeScript handler
  under src/jobs/handlers/, JobRegistry registration, and cron_jobs row via API.
  Use when creating a cron job, cron handler, scheduled task, task_key, or
  extending the job scheduler.
---

# Add Cron Handler (notification-service)

## Overview

A cron job needs **two linked pieces**:

1. **Handler code** — registered in `JobRegistry` by `task_key`.
2. **DB row** — `cron_jobs` row with the same `task_key` (create via API, not raw SQL unless troubleshooting).

The scheduler only runs handlers that exist in the registry. The API rejects unknown `task_key` values on create/resume.

## Checklist

```
- [ ] 1. Create handler in src/jobs/handlers/<name>.ts
- [ ] 2. Register task_key in src/jobs/job-registry.ts
- [ ] 3. Create cron_jobs row (POST /cron-jobs)
- [ ] 4. Verify: pnpm typecheck, manual run, check runs
```

## Step 1 — Handler file

Location: `src/jobs/handlers/<kebab-or-domain-name>.ts`

Use `CronJobHandler` from `@/types/jobs/index.js`. Use `getLogger` with context `jobs.handlers.<name>` — never `console.log`.

```ts
import { getLogger } from '@/logging/logger.js';
import type { CronJobHandler } from '@/types/jobs/index.js';

const log = getLogger('jobs.handlers.my-job');

export const myJobHandler: CronJobHandler = async ({
  job,
  config,
  runId,
  workerId,
  triggeredBy,
  signal,
}) => {
  if (signal.aborted) {
    log.warn({ jobKey: job.key, runId, msg: 'Job aborted before start' });
    return;
  }

  log.info({ jobKey: job.key, runId, workerId, triggeredBy, config, msg: 'Job started' });

  // Business logic here. Read params from config (JSON from cron_jobs.config).

  return {
    metadata: {
      job_key: job.key,
      run_id: runId,
      // counts, ids processed, etc. — persisted in cron_job_runs.metadata
    },
  };
};
```

### Handler context

| Field | Source |
|-------|--------|
| `job` | Full `cron_jobs` row |
| `config` | `job.config` (JSONB) |
| `runId` | Current `cron_job_runs.id` |
| `workerId` | Process instance that claimed the lease |
| `triggeredBy` | `schedule` \| `manual` \| `startup` \| `system` |
| `signal` | Aborts when `max_runtime_seconds` is exceeded |

### Rules

- **Idempotent** — safe if retried or run twice.
- **Respect `signal.aborted`** in loops and long work.
- **No secrets in `config`** — use env vars (`getEnv()`).
- **Return useful `metadata`** for auditing in `cron_job_runs`.
- **Odoo jobs** — use `src/db/odoo/*`; **Supabase** — use `src/persistence/repositories/*`.
- Imports must use `.js` extension (NodeNext): `@/jobs/foo.js`.

## Step 2 — Register in JobRegistry

File: [`src/jobs/job-registry.ts`](src/jobs/job-registry.ts)

```ts
import { myJobHandler } from '@/jobs/handlers/my-job.js';

// inside createDefaultJobRegistry():
registry.register('internal.my_job', myJobHandler);
```

### Naming `task_key`

Use dot-separated namespaces:

| Provider | Pattern | Example |
|----------|---------|---------|
| `internal` | `internal.<action>` | `internal.noop`, `internal.notification` |
| `odoo` | `odoo.<domain>.<action>` | `odoo.fleet.sync_vehicles` |
| `supabase` | `supabase.<domain>.<action>` | `supabase.companies.sync` |

`registry.register('<task_key>', ...)` must match `cron_jobs.task_key` exactly. Keys are unique per handler; duplicate registration throws at startup.

## Step 3 — Create the cron_jobs row

Prefer the HTTP API (header `x-api-key: $SERVICE_API_KEY`):

```bash
curl -sS -X POST http://localhost:3000/cron-jobs \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "key": "internal.my_job.daily",
    "name": "My job daily",
    "description": "What this job does",
    "provider": "internal",
    "task_key": "internal.my_job",
    "schedule": "0 8 * * *",
    "timezone": "America/Mexico_City",
    "enabled": true,
    "no_overlap": true,
    "max_runtime_seconds": 900,
    "config": {}
  }'
```

### Field notes

| Field | Notes |
|-------|-------|
| `key` | Unique human id (immutable after create). e.g. `odoo.fleet.sync_vehicles` |
| `provider` | `odoo` \| `supabase` \| `internal` |
| `task_key` | Must match `JobRegistry` |
| `schedule` | `node-cron` expression (validated on API and scheduler) |
| `timezone` | IANA, e.g. `America/Mexico_City`, `UTC` |
| `enabled` | `false` = paused; scheduler skips it |
| `no_overlap` | Prevents overlap in same Node process |
| `max_runtime_seconds` | Handler timeout + multi-instance lease duration |
| `config` | Handler-specific JSON (no secrets) |

After create/update/pause/resume/delete, the service reconciles the scheduler automatically.

## Verify

1. `pnpm typecheck`
2. Ensure migration applied and `CRON_SCHEDULER_ENABLED=true` for scheduled runs
3. Manual test:

```bash
# Replace <job-id> from create response
curl -sS -X POST "http://localhost:3000/cron-jobs/<job-id>/run" \
  -H "x-api-key: $SERVICE_API_KEY"
```

4. Check runs:

```bash
curl -sS "http://localhost:3000/cron-jobs/<job-id>/runs?limit=5" \
  -H "x-api-key: $SERVICE_API_KEY"
```

Paused jobs return `409 CRON_JOB_RUN_SKIPPED` on manual run — resume first with `POST /cron-jobs/:id/resume`.

## Key files

| Purpose | Path |
|---------|------|
| Handlers | `src/jobs/handlers/` |
| Registry | `src/jobs/job-registry.ts` |
| Handler type | `src/types/jobs/cron-job.ts` |
| Runner / scheduler | `src/jobs/job-runner.ts`, `src/jobs/dynamic-cron-scheduler.ts` |
| CRUD API | `src/http/routes/cron-job.routes.ts`, `src/jobs/cron-job.service.ts` |
| Full guide | `src/jobs/README.md` |

## Do not

- Execute arbitrary code from DB — only whitelisted `task_key` in registry.
- Edit `lock_owner`, `locked_until`, `last_*` via API (runner-owned).
- Change `key` after creation.
- Skip registry registration — job will fail or API will reject unknown `task_key`.
