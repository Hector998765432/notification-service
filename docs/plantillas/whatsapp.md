# Plantilla de WhatsApp — alta y envío

Guía paso a paso para aprobar una plantilla en Twilio, registrarla en Supabase y enviarla con `POST /notifications`.

## Requisitos previos

- [ ] Migración de plantillas aplicada en Supabase
- [ ] Cuenta Twilio con WhatsApp Business configurado
- [ ] `SERVICE_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` configurados
- [ ] `TWILIO_WHATSAPP_FROM` o `TWILIO_MESSAGING_SERVICE_SID` configurado
- [ ] Clasificación creada (ver [clasificaciones.md](./clasificaciones.md))

## Resumen del flujo

```
Twilio (crear + aprobar Content) → Clasificación → Crear plantilla en DB (content_sid + variables) → POST /notifications
```

WhatsApp **no admite texto libre** en el endpoint de notificaciones: siempre se usa una plantilla aprobada por Twilio identificada por su Content SID (`HX...`).

---

## Paso 1 — Crear y aprobar la plantilla en Twilio

1. Entra a [Twilio Console](https://console.twilio.com/) → **Messaging** → **Content Template Builder** (o Content API).
2. Crea una plantilla para WhatsApp con placeholders posicionales: `{{1}}`, `{{2}}`, etc.

   Ejemplo de cuerpo aprobado:
   ```
   Hola {{1}}, tu unidad con terminación {{2}} requiere revisión. Responde REVISAR.
   ```

3. Envía la plantilla a **aprobación de WhatsApp** (Meta).
4. Cuando esté aprobada, copia el **Content SID** (formato `HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`).

> El orden de los placeholders en Twilio debe coincidir con el orden del array `variables` que registrarás en la base de datos.

---

## Paso 2 — Mapear variables lógicas

Twilio usa slots posicionales (`{{1}}`, `{{2}}`). En la API del servicio usas nombres semánticos en `templateVars`; el servicio los mapea a posiciones según el array `variables`.

| Orden | Placeholder Twilio | Nombre lógico (ejemplo) | Uso en templateVars |
|:-----:|:------------------:|:-----------------------:|:-------------------:|
| 1 | `{{1}}` | `customerName` | `"customerName": "Juan"` |
| 2 | `{{2}}` | `serialEnding` | `"serialEnding": "A1B2"` |

Documenta este mapeo antes de dar de alta la plantilla.

### Variable de correlación (opcional)

Si necesitas que respuestas entrantes (ej. keyword `REVISAR`) se correlacionen con el envío, define `correlation_var` con uno de los nombres en `variables` (típicamente el identificador que el usuario verá o enviará de vuelta).

Ejemplo: `correlation_var: "serialEnding"` guarda el valor en `whatsapp_message_context` al enviar.

---

## Paso 3 — Obtener el ID de clasificación

```bash
curl -sS "$API_BASE/template-classifications" \
  -H "x-api-key: $SERVICE_API_KEY"
```

Ejemplo: clasificación `contracts` para mensajes de contratos.

---

## Paso 4 — Dar de alta la plantilla en Supabase

```bash
curl -sS -X POST "$API_BASE/notification-templates" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "classification_id": "<uuid-clasificacion>",
    "name": "contract-status-review",
    "channel": "whatsapp",
    "content_sid": "HXaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "variables": ["customerName", "serialEnding"],
    "correlation_var": "serialEnding",
    "is_active": true
  }'
```

### Campos del body

| Campo | Obligatorio | Descripción |
|-------|:-----------:|-------------|
| `classification_id` | Sí | UUID de `template_classifications` |
| `name` | Sí | kebab-case; valor de `whatsapp.template` al enviar |
| `channel` | Sí | `"whatsapp"` |
| `content_sid` | Sí | Content SID de Twilio (`HX` + hex) |
| `variables` | Sí | Array ordenado de nombres lógicos |
| `correlation_var` | No | Debe existir en `variables` |
| `is_active` | No | Default `true` |

### Validaciones al crear

| Regla | Código HTTP |
|-------|-------------|
| `name` en kebab-case | 400 |
| `content_sid` formato `^HX[a-f0-9]+$` | 400 |
| `variables` array no vacío | 400 |
| `correlation_var` ∈ `variables` | 400 |
| No incluir `html_body` ni `default_subject` | 400 |
| `name` único para `channel=whatsapp` | 409 |

---

## Paso 5 — Plantilla seed `contract-status-review`

La migración inicial crea esta plantilla con un `content_sid` placeholder. **Debes actualizarlo** con el HX real de tu cuenta Twilio:

```bash
# 1. Obtener el id de la plantilla
curl -sS "$API_BASE/notification-templates?channel=whatsapp" \
  -H "x-api-key: $SERVICE_API_KEY"

# 2. Actualizar content_sid
curl -sS -X PATCH "$API_BASE/notification-templates/<uuid>" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "content_sid": "HXtu_content_sid_real"
  }'
```

---

## Paso 6 — Verificar el registro

```bash
curl -sS "$API_BASE/notification-templates?channel=whatsapp" \
  -H "x-api-key: $SERVICE_API_KEY"
```

Confirma:

- `is_active: true`
- `content_sid` correcto (no placeholder)
- `variables` en el orden acordado con Twilio

---

## Paso 7 — Enviar un mensaje WhatsApp

```bash
curl -sS -X POST "$API_BASE/notifications" \
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

### Formato de destinatarios

- E.164: `+5215512345678`
- Con prefijo Twilio: `whatsapp:+5215512345678`

### Reglas del envío

| Regla | Detalle |
|-------|---------|
| `template` | Requerido (no hay HTML libre en este canal) |
| `templateVars` | Todas las claves de `variables` son obligatorias |
| Plantilla activa | `is_active: true` |
| Content SID | Debe ser válido en Twilio |

El servicio traduce internamente a:

```json
{
  "contentSid": "HX...",
  "contentVariables": { "1": "Juan Pérez", "2": "A1B2" }
}
```

---

## Paso 8 — Actualizar o desactivar la plantilla

### Cambiar Content SID (nueva versión en Twilio)

```bash
curl -sS -X PATCH "$API_BASE/notification-templates/<uuid>" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "content_sid": "HXnuevo_sid_aprobado"
  }'
```

### Cambiar orden o nombres de variables

Actualiza `variables` solo si coincide con la plantilla aprobada en Twilio:

```bash
curl -sS -X PATCH "$API_BASE/notification-templates/<uuid>" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "variables": ["customerName", "serialEnding", "dueDate"]
  }'
```

> Si cambias el número u orden de variables, la plantilla en Twilio también debe tener el mismo número de placeholders.

### Desactivar

```bash
curl -sS -X PATCH "$API_BASE/notification-templates/<uuid>" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{ "is_active": false }'
```

---

## Paso 9 — Respuestas entrantes (opcional)

Si configuraste `correlation_var`, al enviar se guarda contexto en `whatsapp_message_context`.

Webhook de Twilio (sin `x-api-key`):

```
POST /webhooks/twilio/whatsapp
```

Variables de entorno relacionadas:

```env
TWILIO_VALIDATE_SIGNATURE=true
TWILIO_WEBHOOK_BASE_URL=https://api.tudominio.com
WHATSAPP_REVISAR_KEYWORD=REVISAR
```

Cuando el usuario responde con el keyword configurado, el servicio busca el contexto por teléfono y usa `serial_ending` (u otra variable de correlación) para el flujo de negocio.

---

## Envío desde código interno

```ts
import { getNotificationService } from '@/bootstrap/create-services.js';

await getNotificationService().send({
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

---

## Envío multi-canal (email + WhatsApp)

```bash
curl -sS -X POST "$API_BASE/notifications" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "channels": ["email", "whatsapp"],
    "email": {
      "to": ["ops@example.com"],
      "template": "crash-alert",
      "templateVars": {
        "serviceName": "notification-service",
        "errorMessage": "Error de prueba"
      }
    },
    "whatsapp": {
      "to": ["+5215512345678"],
      "template": "contract-status-review",
      "templateVars": {
        "customerName": "Juan",
        "serialEnding": "XY99"
      }
    }
  }'
```

---

## Solución de problemas

| Mensaje / síntoma | Causa probable | Acción |
|-------------------|----------------|--------|
| `Unknown whatsapp template: ...` | No existe en DB | `GET /notification-templates?channel=whatsapp` |
| `whatsapp template "..." is inactive` | `is_active: false` | PATCH `is_active: true` |
| `Missing template variable "..."` | Falta clave en `templateVars` | Enviar todas las de `variables` |
| Twilio 63016 / template error | SID incorrecto o no aprobado | Verificar HX en Console |
| Variables no coinciden | Orden distinto a Twilio | Alinear `variables` con `{{1}}`, `{{2}}`... |
| Placeholder seed `HX0000...` | Migración sin SID real | PATCH con content_sid de producción |

---

## Checklist de alta

```
[ ] Plantilla creada y aprobada en Twilio
[ ] Content SID (HX...) copiado
[ ] Mapeo variables lógicas ↔ {{1}}, {{2}} documentado
[ ] Clasificación creada o identificada
[ ] POST /notification-templates exitoso
[ ] content_sid real (no placeholder) verificado
[ ] POST /notifications de prueba exitoso
[ ] (Opcional) correlation_var + webhook inbound configurados
```

## Referencia rápida: plantilla `contract-status-review`

| Campo | Valor |
|-------|-------|
| `name` | `contract-status-review` |
| `variables` | `["customerName", "serialEnding"]` |
| `correlation_var` | `serialEnding` |
| `templateVars` ejemplo | `{ "customerName": "...", "serialEnding": "..." }` |
