---
name: send-whatsapp
description: >-
  Sends WhatsApp messages via notification-service POST /notifications or
  POST /notifications/whatsapp/bulk using Twilio approved templates stored in
  Supabase. Use when sending WhatsApp, Twilio WhatsApp, template message, bulk
  WhatsApp, or notification channel whatsapp.
---

# Send WhatsApp (notification-service)

## Quick send — HTTP API (single)

`POST /notifications` with header `x-api-key: $SERVICE_API_KEY`.

WhatsApp **only supports approved Twilio templates** (no freeform body on this endpoint).

```bash
curl -sS -X POST http://localhost:3000/notifications \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "channels": ["whatsapp"],
    "whatsapp": {
      "to": ["+5215512345678"],
      "template": "contract-status-review",
      "templateVars": {
        "customerName": "Juan Pérez",
        "serialEnding": "A1B2"
      }
    }
  }'
```

## Bulk send — HTTP API

`POST /notifications/whatsapp/bulk` — send many WhatsApp notifications in one request. Each item in `messages` has the same shape as the `whatsapp` block above. Multiple recipients in `to` are flattened into individual sends.

```bash
curl -sS -X POST http://localhost:3000/notifications/whatsapp/bulk \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "messages": [
      {
        "to": ["+524424605508"],
        "template": "auto-service-day-before",
        "templateVars": {
          "customerName": "Juan Pérez",
          "serialEnding": "A1B2"
        }
      },
      {
        "to": ["+525512345678"],
        "template": "gps-renewal",
        "templateVars": { "customerName": "Ana" }
      }
    ]
  }'
```

Returns **200** with `{ total, succeeded, failed, results[] }` — partial failures do not abort the response (unlike single `/notifications` which returns 502 on channel failure).

### Recipient format

- E.164: `+5215512345678`
- Optional prefix: `whatsapp:+5215512345678`
- Validated by regex in `notification.validator.ts` and `whatsapp-bulk.validator.ts`

### Template vars

Logical names must match the `variables` array on the template row in `notification_templates`. They map to Twilio positional slots `{ "1": "...", "2": "..." }`.

For `contract-status-review`:
| templateVars key | Twilio slot |
|------------------|-------------|
| `customerName` | `{{1}}` |
| `serialEnding` | `{{2}}` |

If `correlation_var` is set on the template, outbound context is stored in `whatsapp_message_context` for inbound `REVISAR` replies.

List templates: `GET /notification-templates?channel=whatsapp`.

## Send from code

### Single message

```ts
import { getNotificationService } from '@/bootstrap/create-services.js';

const result = await notificationService.send({
  channels: ['whatsapp'],
  whatsapp: {
    to: ['+5215512345678'],
    template: 'contract-status-review',
    templateVars: {
      customerName: 'Juan Pérez',
      serialEnding: 'A1B2',
    },
  },
});
```

### Bulk (cron jobs, internal flows)

```ts
import { getWhatsAppBulkSendService } from '@/bootstrap/create-services.js';

const result = await getWhatsAppBulkSendService().sendBulk(
  [
    { to: '+5215512345678', template: 'auto-service-day-before', templateVars: { ... } },
    { to: '+525512345678', template: 'gps-renewal', templateVars: { ... } },
  ],
  { signal }, // optional AbortSignal
);
// result: { total, succeeded, failed, results[] }
```

## Multi-channel (email + WhatsApp)

```json
{
  "channels": ["email", "whatsapp"],
  "email": { "to": ["ops@example.com"], "template": "crash-alert", "templateVars": {} },
  "whatsapp": { "to": ["+5215512345678"], "template": "contract-status-review", "templateVars": {} }
}
```

## Architecture

```
POST /notifications
  → NotificationService → WhatsAppChannelHandler
  → sendResolvedWhatsAppTemplate()
  → RateLimitedWhatsAppProvider → TwilioWhatsAppProvider

POST /notifications/whatsapp/bulk
  → WhatsAppBulkSendService.sendBulk()
  → sendResolvedWhatsAppTemplate() (per message)
  → RateLimitedWhatsAppProvider → TwilioWhatsAppProvider
```

| Layer | Path |
|-------|------|
| Validator (single) | `src/http/validators/notification.validator.ts` |
| Validator (bulk) | `src/http/validators/whatsapp-bulk.validator.ts` |
| Controller (bulk) | `src/http/controllers/whatsapp-bulk.controller.ts` |
| Channel | `src/notifications/channels/whatsapp-channel.ts` |
| Bulk service | `src/whatsapp/whatsapp-bulk-send.service.ts` |
| Send helper | `src/whatsapp/send-whatsapp-template.ts` |
| Rate limiter | `src/whatsapp/strict-rate-limiter.ts` |
| Rate-limited provider | `src/whatsapp/rate-limited-whatsapp-provider.ts` |
| Template service | `src/templates/notification-template.service.ts` |
| Twilio provider | `src/whatsapp/providers/twilio-whatsapp-provider.ts` |
| Inbound webhook | `POST /webhooks/twilio/whatsapp` |

## Rate limit

All WhatsApp sends (single API, bulk API, cron jobs, inbound replies) share a **strict process-wide rate limit**:

```env
WHATSAPP_RATE_LIMIT_PER_SECOND=70
```

Uses a 1-second sliding window — never more than N message sends are started in any 1000 ms window, even under concurrent callers.

## Required env

```env
WHATSAPP_PROVIDER=twilio
WHATSAPP_RATE_LIMIT_PER_SECOND=70
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=+18156624059
# or TWILIO_MESSAGING_SERVICE_SID=MG...
```

Content SIDs are stored per template in `notification_templates.content_sid` (not env vars).

## Inbound replies (optional)

Twilio webhook: `POST /webhooks/twilio/whatsapp` (no `x-api-key`; uses `X-Twilio-Signature`).

Keyword `WHATSAPP_REVISAR_KEYWORD` (default `REVISAR`) triggers contract lookup using stored context.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `Unknown whatsapp template` | Name must exist in `notification_templates` with `channel=whatsapp` |
| `template is inactive` | Set `is_active=true` via PATCH |
| `Missing template variable` | All `variables[]` keys required in `templateVars` |
| Twilio 63016 / template errors | Template not approved or vars don't match Twilio Content |
| Account blocked / throttled | Lower `WHATSAPP_RATE_LIMIT_PER_SECOND`; bulk sends are already rate-limited |

## Add a new template

Use skill **`add-whatsapp-twilio-template`** — register via `POST /notification-templates`.
