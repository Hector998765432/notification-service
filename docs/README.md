# Documentación — notification-service

Guías operativas para configurar y usar el servicio de notificaciones.

## Plantillas de notificación

Las plantillas de **email** y **WhatsApp** se almacenan en Supabase y se administran vía API REST. No requieren deploy de código para dar de alta una plantilla nueva.

| Guía | Descripción |
|------|-------------|
| [Índice de plantillas](./plantillas/README.md) | Visión general del modelo de datos y flujo |
| [Clasificaciones](./plantillas/clasificaciones.md) | Catálogo de tipos de plantilla (CRUD) |
| [Plantilla de email](./plantillas/email.md) | Alta, envío y validación de plantillas email |
| [Plantilla de WhatsApp](./plantillas/whatsapp.md) | Alta en Twilio + Supabase, envío e inbound |

## Requisitos comunes

- Servicio en ejecución (`pnpm dev` o despliegue activo)
- Variable `SERVICE_API_KEY` configurada
- Migración `20260701000001_create_notification_templates.sql` aplicada en Supabase
- Header `x-api-key` en todas las peticiones a la API (excepto `/health` y webhooks)

```bash
export API_BASE=http://localhost:3000
export SERVICE_API_KEY=tu-api-key
```

## Endpoints principales

| Método | Ruta | Uso |
|--------|------|-----|
| `GET/POST` | `/template-classifications` | Listar / crear clasificaciones |
| `GET/PATCH/DELETE` | `/template-classifications/:id` | Consultar / actualizar / eliminar |
| `GET/POST` | `/notification-templates` | Listar / crear plantillas |
| `GET/PATCH/DELETE` | `/notification-templates/:id` | Consultar / actualizar / eliminar |
| `POST` | `/notifications` | Enviar notificación por canal |

## Variables de entorno por canal

### Email (Resend)

```env
EMAIL_PROVIDER=resend
EMAIL_FROM=alerts@yourdomain.com
RESEND_API_KEY=re_...
```

### WhatsApp (Twilio)

```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=+5215512345678
# o TWILIO_MESSAGING_SERVICE_SID=MG...
```

El **Content SID** (`HX...`) de cada plantilla WhatsApp se guarda en la base de datos (`notification_templates.content_sid`), no en variables de entorno.
