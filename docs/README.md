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
| [Notificaciones de contratos](./notificaciones-contratos.md) | Cron de contratos por vencer, WhatsApp y correos LMM |

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
| `POST` | `/notifications/whatsapp/bulk` | Enviar múltiples notificaciones WhatsApp en lote |

## Rate limit de WhatsApp

Todos los envíos de WhatsApp (API individual, bulk HTTP y cron jobs) comparten un **rate limit estricto** configurable para evitar bloqueos de la cuenta de WhatsApp Business:

```env
WHATSAPP_RATE_LIMIT_PER_SECOND=70
```

El límite usa una ventana deslizante de 1 segundo: nunca se inician más de N envíos en cualquier ventana de 1000 ms, incluso con llamadas concurrentes (API + cron).

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
WHATSAPP_RATE_LIMIT_PER_SECOND=70
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=+5215512345678
# o TWILIO_MESSAGING_SERVICE_SID=MG...
```

El **Content SID** (`HX...`) de cada plantilla WhatsApp se guarda en la base de datos (`notification_templates.content_sid`), no en variables de entorno.

### Alertas y resúmenes internos

```env
CRASH_ALERT_EMAIL=ops@example.com
BUSINESS_SUMMARY_EMAIL=negocio@example.com
```

| Variable | Uso |
|----------|-----|
| `CRASH_ALERT_EMAIL` | Crash alerts y destinatarios base de correos de resumen de cron |
| `BUSINESS_SUMMARY_EMAIL` | Destinatarios adicionales del resumen de negocio LMM (opcional; se fusiona con crash alert) |

Ver [Notificaciones de contratos](./notificaciones-contratos.md) para el flujo completo.
