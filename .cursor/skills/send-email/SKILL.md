---
name: send-email
description: >-
  Sends email via notification-service POST /notifications (Resend provider).
  Covers inline HTML, DB-backed templates, and calling from cron handlers or
  NotificationService. Use when sending email, correo, Resend, email template,
  or notification channel email.
---

# Send Email (notification-service)

## Quick send — HTTP API

`POST /notifications` with header `x-api-key: $SERVICE_API_KEY`.

### Option A — Inline HTML

```bash
curl -sS -X POST http://localhost:3000/notifications \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "channels": ["email"],
    "email": {
      "to": ["user@example.com"],
      "subject": "Asunto del correo",
      "html": "<p>Hola <strong>mundo</strong></p>",
      "text": "Hola mundo"
    }
  }'
```

Rules:
- `subject` is **required** when using `html` (no template).
- `html` and `template` are mutually exclusive.

### Option B — Registered template (Supabase)

```bash
curl -sS -X POST http://localhost:3000/notifications \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "channels": ["email"],
    "email": {
      "to": ["user@example.com"],
      "template": "crash-alert",
      "templateVars": {
        "serviceName": "notification-service",
        "errorMessage": "Something failed",
        "requestId": "req-123"
      }
    }
  }'
```

Templates are stored in `notification_templates` with `channel=email`. List them: `GET /notification-templates?channel=email`.

Placeholders in `html_body` use **single braces**: `{serviceName}`, not `{{serviceName}}`. Rendered by [`applyTemplate`](src/utils/template.ts).

## Send from code (cron handler or service)

```ts
import { getNotificationService } from '@/bootstrap/create-services.js';

const notificationService = getNotificationService();

const result = await notificationService.send({
  channels: ['email'],
  email: {
    to: ['user@example.com'],
    template: 'crash-alert',
    templateVars: {
      serviceName: 'notification-service',
      errorMessage: err instanceof Error ? err.message : String(err),
      requestId,
    },
  },
});

if (!result.allSucceeded) {
  // inspect result.results[].error
}
```

## Architecture

```
POST /notifications
  → notification.controller
  → NotificationService.send()
  → EmailChannelHandler
  → NotificationTemplateService.resolveEmailTemplate()
  → EmailProvider (Resend)
```

| Layer | Path |
|-------|------|
| Validator | `src/http/validators/notification.validator.ts` |
| Channel | `src/notifications/channels/email-channel.ts` |
| Template service | `src/templates/notification-template.service.ts` |
| Provider factory | `src/email/create-email-provider.ts` |

## Required env

```env
EMAIL_PROVIDER=resend
EMAIL_FROM=alerts@yourdomain.com
RESEND_API_KEY=re_...
CRASH_ALERT_EMAIL=ops@example.com
BUSINESS_SUMMARY_EMAIL=negocio@example.com
```

`BUSINESS_SUMMARY_EMAIL` is optional; merged with `CRASH_ALERT_EMAIL` for summary emails (deduplicated).

## System email templates (cron / alerts)

| Template | Service | Trigger |
|----------|---------|---------|
| `crash-alert` | `crash-alert.service.ts` | Fatal process error |
| `notification-run-summary` | `notification-summary.service.ts` | Notification cron, >1 expiring contract |
| `notification-business-summary` | `business-notification-summary.service.ts` | Notification cron, ≥1 expiring contract |

Business summary HTML is authored in **leasing-m** (`emails/NotificationBusinessSummary.tsx`), exported via `pnpm emails:export`, and stored in Supabase migration `20260709000001_...`.

See `docs/notificaciones-contratos.md` for the full contract notification flow.

## Add a new email template

```bash
curl -sS -X POST http://localhost:3000/notification-templates \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "classification_id": "<uuid>",
    "name": "my-template",
    "channel": "email",
    "html_body": "<p>Hola {userName}</p>",
    "default_subject": "Hello"
  }'
```

1. Ensure a classification exists (`GET/POST /template-classifications`).
2. Create template via `POST /notification-templates` with `html_body` and `default_subject`.
3. `pnpm typecheck` and test via `POST /notifications`.

## Do not

- Put secrets in `templateVars`.
- Mix `html` and `template` in the same request.
- Omit `subject` when sending raw `html`.
