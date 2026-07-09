# Schema reference (generated from codebase types)

Read `src/types/supabase/database.types.ts` after any migration change.

## Supabase — Row shapes

### companies
```ts
{ id: string; odoo_partner_id: number; name: string; created_at: string; updated_at: string }
```

### profiles
```ts
{
  id: string;           // = auth.users.id
  role_id: string;
  company_id: string | null;
  username: string | null;
  phone: string | null;
  updated_at: string;
  avatar_url: string | null;
}
```

### cron_jobs
```ts
{
  id: string;
  key: string;
  name: string;
  description: string | null;
  provider: 'odoo' | 'supabase' | 'internal';
  task_key: string;
  schedule: string;       // cron expression
  timezone: string;
  enabled: boolean;
  no_overlap: boolean;
  max_runtime_seconds: number;
  config: Json;
  lock_owner: string | null;
  locked_until: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: 'running' | 'success' | 'failed' | 'skipped' | 'timeout' | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}
```

### cron_job_runs
```ts
{
  id: string;
  job_id: string;
  status: 'running' | 'success' | 'failed' | 'skipped' | 'timeout';
  triggered_by: 'schedule' | 'manual' | 'startup' | 'system';
  worker_id: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  metadata: Json;
}
```

### notification_templates
```ts
{
  id: string;
  classification_id: string;
  name: string;
  channel: 'email' | 'whatsapp';
  is_active: boolean;
  html_body: string | null;        // email only
  default_subject: string | null;  // email only
  content_sid: string | null;      // whatsapp only (Twilio)
  variables: Json | null;          // whatsapp: string[] e.g. ["customerName","serialEnding"]
  correlation_var: string | null;  // whatsapp: which var stores VIN suffix for inbound
  bulk: boolean;                   // whatsapp: true for global_bulk template
  created_at: string;
  updated_at: string;
}
```

**Seeded email templates:** `crash-alert`, `notification-run-summary`, `notification-business-summary`.

### whatsapp_message_context
```ts
{
  id: string;
  phone: string;          // normalized E.164 via normalizePhone()
  serial_ending: string;
  template: string;
  message_sid: string | null;
  created_at: string;
}
```

### company_members / company_member_units
```ts
// company_members
{ id, company_id, profile_id, company_role_id, invited_by, created_at, updated_at }

// company_member_units
{ id, company_member_id, vin, assigned_by, created_at }
```

## ER (Supabase)

```
auth.users ──1:1── profiles ──N:1── companies ── odoo_partner_id → Odoo res.partner.id
profiles ──N:M── companies via company_members
company_members ──1:N── company_member_units (vin)
company_members ──N:M── permissions via company_member_permissions
profiles ──N:1── roles ──N:M── permissions via role_permissions
template_classifications ──1:N── notification_templates
cron_jobs ──1:N── cron_job_runs
```

## Odoo — fleet.vehicle (fields used in repo)

`id`, `name`, `license_plate`, `vin_sn`, `model_id`, `brand_id`, `driver_id`, `state_id`, `location`, `seats`, `doors`, `color`, `model_year`, `acquisition_date`, `first_contract_date`, `odometer`, `odometer_unit`, `fuel_type`, `horsepower`, `horsepower_tax`, `power`, `co2`, `company_id`, `active`, `car_value`, `residual_value`, `plan_to_change_car`, `x_studio_nombre_del_usuario`

## Odoo — fleet.vehicle.log.contract (fields used in repo)

**By VIN:** full record (no field filter in `getContractVehiclesByVinSn`)

**Stats query fields:** `vehicle_id`, `days_left`, `state`, `expires_today`, `start_date`, `expiration_date`, `x_studio_numero_de_chasis_de_la_unidad`

**Expiring contracts (`getExpiringContracts`):** `cost_subtype_id`, `expiration_date`, `vehicle_id`, `purchaser_id`, `x_studio_numero_de_chasis_de_la_unidad`, `days_left` — filtered in memory for `days_left` 30, 1, or ≤0.

**Formatting (REVISAR):** `name`, `vehicle_id`, `state`, `start_date`, `expiration_date`, `days_left`

## Odoo — res.partner (fields used in repo)

`name`, `email`, `phone`, `mobile`, `street`, `street2`, `city`, `state_id`, `zip`, `country_id`, `vat`, `website`, `industry_id`, `user_id`, `company_id`, `customer_rank`, `supplier_rank`, `is_company`, `parent_id`
