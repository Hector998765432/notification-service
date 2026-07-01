-- Template classifications catalog and notification templates (email + WhatsApp).

create table if not exists public.template_classifications (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint template_classifications_name_unique unique (name)
);

create table if not exists public.notification_templates (
  id                uuid primary key default gen_random_uuid(),
  classification_id uuid not null references public.template_classifications (id) on delete restrict,
  name              text not null,
  channel           text not null,
  is_active         boolean not null default true,
  html_body         text,
  default_subject   text,
  content_sid       text,
  variables         jsonb,
  correlation_var   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint notification_templates_name_channel_unique unique (name, channel),
  constraint notification_templates_channel_check check (channel in ('email', 'whatsapp')),
  constraint notification_templates_email_fields_check check (
    channel <> 'email'
    or (html_body is not null and default_subject is not null and content_sid is null and variables is null)
  ),
  constraint notification_templates_whatsapp_fields_check check (
    channel <> 'whatsapp'
    or (
      content_sid is not null
      and variables is not null
      and jsonb_typeof(variables) = 'array'
      and html_body is null
      and default_subject is null
    )
  )
);

create index if not exists idx_notification_templates_lookup
  on public.notification_templates (name, channel, is_active);

create index if not exists idx_notification_templates_classification
  on public.notification_templates (classification_id);

-- Seed classifications
insert into public.template_classifications (name)
values ('system'), ('contracts')
on conflict (name) do nothing;

-- Seed email template: crash-alert
insert into public.notification_templates (
  classification_id,
  name,
  channel,
  html_body,
  default_subject
)
select
  tc.id,
  'crash-alert',
  'email',
  $html$<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Crash Alert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827; background: #f9fafb; margin: 0; padding: 24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
    <tr>
      <td style="padding: 24px;">
        <h1 style="margin: 0 0 8px; font-size: 20px; color: #b91c1c;">Application Crash Alert</h1>
        <p style="margin: 0 0 16px; color: #6b7280;">The service encountered a fatal error and may have stopped.</p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Service</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">{serviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Environment</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">{environment}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Timestamp</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">{timestamp}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;"><strong>Request ID</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">{requestId}</td>
          </tr>
        </table>

        <h2 style="margin: 0 0 8px; font-size: 16px;">Error</h2>
        <pre style="white-space: pre-wrap; word-break: break-word; background: #fef2f2; color: #991b1b; padding: 12px; border-radius: 6px; border: 1px solid #fecaca; margin: 0 0 16px;">{errorMessage}</pre>

        <h2 style="margin: 0 0 8px; font-size: 16px;">Stack Trace</h2>
        <pre style="white-space: pre-wrap; word-break: break-word; background: #f3f4f6; color: #374151; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 0;">{errorStack}</pre>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  '[CRASH] Application error detected'
from public.template_classifications tc
where tc.name = 'system'
on conflict (name, channel) do nothing;

-- Seed WhatsApp template: contract-status-review
-- Update content_sid via PATCH /notification-templates/:id after deploy (migrate from TWILIO_TEMPLATE_CONTRACT_STATUS_REVIEW env).
insert into public.notification_templates (
  classification_id,
  name,
  channel,
  content_sid,
  variables,
  correlation_var
)
select
  tc.id,
  'contract-status-review',
  'whatsapp',
  'HX00000000000000000000000000000000',
  '["customerName", "serialEnding"]'::jsonb,
  'serialEnding'
from public.template_classifications tc
where tc.name = 'contracts'
on conflict (name, channel) do nothing;
