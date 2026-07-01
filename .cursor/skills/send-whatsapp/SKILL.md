---
name: send-whatsapp
description: >-
  Sends WhatsApp messages via notification-service POST /notifications using
  Twilio approved templates stored in Supabase. Use when sending WhatsApp, Twilio
  WhatsApp, template message, or notification channel whatsapp.
---

# Send WhatsApp (notification-service)

## Quick send — HTTP API

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

### Recipient format

- E.164: `+5215512345678`
- Optional prefix: `whatsapp:+5215512345678`
- Validated by regex in `notification.validator.ts`

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
  → NotificationService
  → WhatsAppChannelHandler
  → NotificationTemplateService.resolveWhatsAppTemplate()
  → TwilioWhatsAppProvider.send({ contentSid, contentVariables })
```

| Layer | Path |
|-------|------|
| Validator | `src/http/validators/notification.validator.ts` |
| Channel | `src/notifications/channels/whatsapp-channel.ts` |
| Template service | `src/templates/notification-template.service.ts` |
| Provider | `src/whatsapp/providers/twilio-whatsapp-provider.ts` |
| Inbound webhook | `POST /webhooks/twilio/whatsapp` |

## Required env

```env
WHATSAPP_PROVIDER=twilio
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

## Add a new template

Use skill **`add-whatsapp-twilio-template`** — register via `POST /notification-templates`.
