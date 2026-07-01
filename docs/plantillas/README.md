# Plantillas de notificación

Este módulo centraliza las plantillas de **email** y **WhatsApp** en Supabase. El campo `template` en `POST /notifications` es el identificador (`name`) de la plantilla registrada en base de datos.

## Modelo de datos

```mermaid
erDiagram
  template_classifications ||--o{ notification_templates : tiene
  template_classifications {
    uuid id PK
    text name UK
    timestamptz created_at
    timestamptz updated_at
  }
  notification_templates {
    uuid id PK
    uuid classification_id FK
    text name
    text channel
    boolean is_active
    text html_body
    text default_subject
    text content_sid
    jsonb variables
    text correlation_var
  }
```

### Reglas importantes

- **`name` + `channel`** es único: el mismo nombre puede existir en email y en WhatsApp, pero no dos veces en el mismo canal.
- **`name`** debe ser kebab-case: `crash-alert`, `contract-status-review`.
- Toda plantilla requiere una **clasificación** (`classification_id`).
- Solo las plantillas con `is_active: true` pueden usarse en envíos.

### Campos por canal

| Campo | Email | WhatsApp |
|-------|:-----:|:--------:|
| `html_body` | Requerido | — |
| `default_subject` | Requerido | — |
| `content_sid` | — | Requerido (`HX...`) |
| `variables` | — | Requerido (array ordenado) |
| `correlation_var` | — | Opcional (debe estar en `variables`) |

## Flujo general de alta

```
1. Crear clasificación (si no existe)
        ↓
2. Crear plantilla en POST /notification-templates
        ↓
3. (WhatsApp) Aprobar plantilla en Twilio y registrar content_sid
        ↓
4. Probar envío con POST /notifications
```

## Guías detalladas

1. [Clasificaciones](./clasificaciones.md) — paso a paso del catálogo
2. [Email](./email.md) — alta y envío de plantillas email
3. [WhatsApp](./whatsapp.md) — alta en Twilio, registro en DB y envío

## Plantillas incluidas en la migración inicial

Tras aplicar la migración `20260701000001_create_notification_templates.sql`:

| name | channel | clasificación | Notas |
|------|---------|---------------|-------|
| `crash-alert` | email | `system` | Alertas de crash del servicio |
| `contract-status-review` | whatsapp | `contracts` | Requiere actualizar `content_sid` con el HX real de Twilio |

## Consultar plantillas existentes

```bash
# Todas las plantillas email
curl -sS "$API_BASE/notification-templates?channel=email" \
  -H "x-api-key: $SERVICE_API_KEY" | jq

# Todas las plantillas WhatsApp activas
curl -sS "$API_BASE/notification-templates?channel=whatsapp&isActive=true" \
  -H "x-api-key: $SERVICE_API_KEY" | jq

# Clasificaciones
curl -sS "$API_BASE/template-classifications" \
  -H "x-api-key: $SERVICE_API_KEY" | jq
```
