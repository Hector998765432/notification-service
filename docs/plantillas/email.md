# Plantilla de email — alta y envío

Guía paso a paso para registrar una plantilla de correo en Supabase y enviarla con `POST /notifications`.

## Requisitos previos

- [ ] Migración de plantillas aplicada en Supabase
- [ ] `SERVICE_API_KEY`, `EMAIL_FROM`, `RESEND_API_KEY` configurados
- [ ] Clasificación creada (ver [clasificaciones.md](./clasificaciones.md))
- [ ] HTML del correo con placeholders en formato `{nombreVariable}` (una sola llave)

## Resumen del flujo

```
Clasificación → Crear plantilla (html_body + default_subject) → POST /notifications
```

---

## Paso 1 — Definir el contenido de la plantilla

### Identificador (`name`)

Elige un nombre en **kebab-case**. Será el valor de `email.template` al enviar.

Ejemplo: `welcome-email`, `crash-alert`, `password-reset`.

### HTML (`html_body`)

Usa placeholders con **una sola llave**:

```html
<p>Hola {userName},</p>
<p>Tu pedido {orderId} fue confirmado.</p>
```

Variables no enviadas en `templateVars` se dejan tal cual en el HTML (comportamiento lenient).

### Asunto por defecto (`default_subject`)

```text
Bienvenido a nuestra plataforma
```

El caller puede sobreescribir el asunto con `email.subject` en el envío.

---

## Paso 2 — Obtener el ID de clasificación

```bash
curl -sS "$API_BASE/template-classifications" \
  -H "x-api-key: $SERVICE_API_KEY"
```

Guarda el `id` de la clasificación que corresponda (ej. `system` para alertas internas).

---

## Paso 3 — Dar de alta la plantilla

```bash
curl -sS -X POST "$API_BASE/notification-templates" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "classification_id": "<uuid-clasificacion>",
    "name": "welcome-email",
    "channel": "email",
    "html_body": "<p>Hola {userName}, bienvenido.</p>",
    "default_subject": "Bienvenido",
    "is_active": true
  }'
```

### Campos del body

| Campo | Obligatorio | Descripción |
|-------|:-----------:|-------------|
| `classification_id` | Sí | UUID de `template_classifications` |
| `name` | Sí | kebab-case, único por canal |
| `channel` | Sí | `"email"` |
| `html_body` | Sí | HTML con `{placeholders}` |
| `default_subject` | Sí | Asunto si el envío no lo especifica |
| `is_active` | No | Default `true` |

### Validaciones al crear

| Regla | Código HTTP |
|-------|-------------|
| `name` en kebab-case | 400 |
| `name` único para `channel=email` | 409 |
| `classification_id` existe | 400 |
| No incluir `content_sid`, `variables`, `correlation_var` | 400 |

---

## Paso 4 — Verificar el registro

```bash
curl -sS "$API_BASE/notification-templates?channel=email&limit=100" \
  -H "x-api-key: $SERVICE_API_KEY"
```

O por ID devuelto en el POST:

```bash
curl -sS "$API_BASE/notification-templates/<uuid>" \
  -H "x-api-key: $SERVICE_API_KEY"
```

---

## Paso 5 — Enviar un correo con la plantilla

```bash
curl -sS -X POST "$API_BASE/notifications" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "channels": ["email"],
    "email": {
      "to": ["usuario@example.com"],
      "template": "welcome-email",
      "templateVars": {
        "userName": "María"
      }
    }
  }'
```

### Reglas del envío

| Regla | Detalle |
|-------|---------|
| `template` o `html` | Uno u otro, no ambos |
| `subject` | Opcional si usas `template` (toma `default_subject`) |
| `subject` | **Requerido** si envías `html` inline |
| Plantilla activa | `is_active` debe ser `true` |
| Plantilla existente | `name` + `channel=email` en DB |

### Respuesta exitosa (ejemplo)

```json
{
  "code": "NOTIFICATION_SENT",
  "data": {
    "results": [
      { "channel": "email", "success": true, "providerId": "..." }
    ],
    "allSucceeded": true
  }
}
```

---

## Paso 6 — Actualizar o desactivar la plantilla

### Cambiar HTML o asunto

```bash
curl -sS -X PATCH "$API_BASE/notification-templates/<uuid>" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "html_body": "<p>Hola {userName}, gracias por registrarte.</p>",
    "default_subject": "Gracias por unirte"
  }'
```

### Desactivar sin borrar

```bash
curl -sS -X PATCH "$API_BASE/notification-templates/<uuid>" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{ "is_active": false }'
```

Los envíos con una plantilla inactiva fallan con: `email template "..." is inactive`.

### Eliminar

```bash
curl -sS -X DELETE "$API_BASE/notification-templates/<uuid>" \
  -H "x-api-key: $SERVICE_API_KEY"
```

---

## Envío desde código interno

```ts
import { getNotificationService } from '@/bootstrap/create-services.js';

await getNotificationService().send({
  channels: ['email'],
  email: {
    to: ['ops@example.com'],
    template: 'crash-alert',
    templateVars: {
      serviceName: 'notification-service',
      environment: 'production',
      timestamp: new Date().toISOString(),
      requestId: 'req-123',
      errorMessage: 'Connection refused',
      errorStack: '...',
    },
  },
});
```

---

## Alternativa: HTML inline (sin plantilla en DB)

```bash
curl -sS -X POST "$API_BASE/notifications" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "channels": ["email"],
    "email": {
      "to": ["usuario@example.com"],
      "subject": "Asunto obligatorio",
      "html": "<p>Contenido directo</p>"
    }
  }'
```

Útil para correos únicos; las plantillas en DB son preferibles para contenido reutilizable.

---

## Solución de problemas

| Mensaje / síntoma | Causa probable | Acción |
|-------------------|----------------|--------|
| `Unknown email template: ...` | `name` no existe o canal incorrecto | Verificar `GET /notification-templates?channel=email` |
| `email template "..." is inactive` | `is_active: false` | PATCH con `is_active: true` |
| 409 al crear | `name` duplicado en email | Usar otro nombre o actualizar la existente |
| Resend error | API key o dominio | Revisar `RESEND_API_KEY` y `EMAIL_FROM` |

## Checklist de alta

```
[ ] Clasificación creada o identificada
[ ] name en kebab-case definido
[ ] html_body con placeholders {var}
[ ] default_subject definido
[ ] POST /notification-templates exitoso
[ ] POST /notifications de prueba exitoso
```
