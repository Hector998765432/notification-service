# Supabase migrations

Run migrations in order (by filename) either:

1. **Supabase Dashboard**: SQL Editor → paste and run each file in `migrations/` (e.g. `20250223000001_...`, then `20250223000002_...`, then `20250223000003_...`).
2. **Supabase CLI**: From project root, `supabase db push` (or link your project and run `supabase migration up`).

After running, new signups get a profile with role `cliente` via trigger. Existing users get a profile with role `cliente` on first dashboard load via `getSessionWithPermissions()`.
