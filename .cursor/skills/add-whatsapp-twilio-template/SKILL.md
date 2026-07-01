---
name: add-whatsapp-twilio-template
description: >-
  Registers a new Twilio WhatsApp template in notification-service via Supabase:
  asks for the approved template body string, detects {{}} variables, maps logical
  names to Twilio positional slots, and creates a row in notification_templates.
  Use when adding WhatsApp template, Twilio Content SID, HX template, or
  configurable WhatsApp message.
---

# Add WhatsApp Twilio Template (notification-service)

## Before coding — collect from user

**Always ask for these inputs** (do not guess):

1. **Template body string** — exact text as approved in Twilio Content, e.g.:
   ```
   Hola {{1}}, tu unidad con terminación {{2}} requiere revisión. Responde REVISAR.
   ```
   Or with named placeholders if that's what Twilio shows:
   ```
   Hola {{customerName}}, tu unidad {{serialEnding}} requiere revisión.
   ```

2. **Twilio Content SID** (`HX...`) — from Twilio Console after approval.

3. **Logical template name** — kebab-case API identifier, e.g. `contract-status-review`.

4. **Classification** — existing `template_classifications` id or name (e.g. `contracts`).

5. **Correlation variable** (optional) — which var links inbound replies (e.g. `serialEnding` for `REVISAR` flow). Omit if no inbound follow-up.

## Step 1 — Detect variables from `{{}}`

Parse the template string the user provided. Extract placeholders in **left-to-right order** (order matters for Twilio `{{1}}`, `{{2}}`, ...).

```ts
const PLACEHOLDER_RE = /\{\{([^}]+)\}\}/g;

export function extractDoubleBraceVariables(templateBody: string): string[] {
  const seen = new Set<string>();
  const variables: string[] = [];

  for (const match of templateBody.matchAll(PLACEHOLDER_RE)) {
    const raw = match[1].trim();
    if (!seen.has(raw)) {
      seen.add(raw);
      variables.push(raw);
    }
  }

  return variables;
}
```

### Map to logical variable names

| Placeholder in string | Logical name to use in code |
|-----------------------|----------------------------|
| `{{1}}`, `{{2}}`, ... | Ask user for semantic names in order (e.g. `customerName`, `serialEnding`) |
| `{{customerName}}` | Use `customerName` directly |
| Mixed | Prefer renaming to semantic camelCase; document mapping in template definition |

**Show the user** a table before implementing:

```
Template: "Hola {{1}}, unidad {{2}}..."
Detected:  [ "1", "2" ]
Proposed:  customerName → {{1}}, serialEnding → {{2}}
```

Confirm with user if names are ambiguous.

## Step 2 — Create classification (if needed)

```bash
curl -sS -X POST http://localhost:3000/template-classifications \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{ "name": "contracts" }'
```

Or list existing: `GET /template-classifications`.

## Step 3 — Register in `notification_templates`

```bash
curl -sS -X POST http://localhost:3000/notification-templates \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "classification_id": "<uuid>",
    "name": "my-new-template",
    "channel": "whatsapp",
    "content_sid": "HX...",
    "variables": ["customerName", "serialEnding"],
    "correlation_var": "serialEnding"
  }'
```

Rules:
- `variables` array order **must match** Twilio positional slots (`index 0` → `"1"`, etc.).
- `name` is kebab-case; used as `whatsapp.template` in `POST /notifications`.
- `content_sid` is stored in DB (no env var per template).

## Step 4 — Twilio Console (user action)

Remind user:
1. Create Content Template in Twilio (WhatsApp Business).
2. Use `{{1}}`, `{{2}}` placeholders matching variable **count and order**.
3. Submit for WhatsApp approval.
4. Copy Content SID (`HX...`) into the template row via POST or PATCH.

Template body in Twilio must match what was parsed; variable count must align.

## Step 5 — Verify

```bash
pnpm typecheck

curl -sS -X POST http://localhost:3000/notifications \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "channels": ["whatsapp"],
    "whatsapp": {
      "to": ["+5215512345678"],
      "template": "my-new-template",
      "templateVars": {
        "customerName": "Test User",
        "serialEnding": "XY99"
      }
    }
  }'
```

Check logs: `whatsapp.twilio` → `Twilio WhatsApp message created`.

If inbound correlation enabled, confirm row in `whatsapp_message_context`.

## Checklist

```
- [ ] Ask user for template body string
- [ ] Run {{}} detection; confirm logical variable names + order
- [ ] Ask user for Twilio Content SID (HX...)
- [ ] Ensure classification exists (GET/POST /template-classifications)
- [ ] POST /notification-templates with content_sid and variables
- [ ] pnpm typecheck + test POST /notifications
```

## Key files

| Purpose | Path |
|---------|------|
| Template service | `src/templates/notification-template.service.ts` |
| Resolve Twilio payload | `resolveWhatsAppTemplate()` in same file |
| CRUD API | `POST /notification-templates` |
| Send API | `POST /notifications` — see `send-whatsapp` skill |
| Context persistence | `src/persistence/repositories/whatsapp-context.repository.ts` |

## Do not

- Hardcode `HX...` Content SIDs in handlers or cron jobs — always via DB.
- Change variable order without updating Twilio template.
- Use single `{var}` — WhatsApp/Twilio templates use `{{n}}` in Content; code maps logical names to positions.
- Skip user confirmation when `{{1}}`/`{{2}}` need semantic names.
