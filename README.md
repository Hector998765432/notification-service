# notification-service

Servicio Node.js con Express, TypeScript y pnpm. Listo para desplegar en Railway.

## Requisitos

- Node.js >= 20
- [pnpm](https://pnpm.io/installation) >= 9.x (`corepack enable` o instalación manual)

## Estructura del proyecto

```text
src/
├── index.ts              # Entry point del servidor
├── app.ts                # Configuración de Express
├── config/
│   └── env.ts            # Variables de entorno
└── routes/
    └── health.routes.ts  # Health check (Railway)
```

## Comandos pnpm

```bash
# Instalar dependencias
pnpm install

# Desarrollo (hot reload)
pnpm dev

# Compilar para producción
pnpm build

# Ejecutar build compilado
pnpm start

# Verificar tipos
pnpm typecheck
```

## Variables de entorno

Copia `.env.example` a `.env` para desarrollo local:

```bash
cp .env.example .env
```

| Variable   | Descripción                          | Default       |
|------------|--------------------------------------|---------------|
| `PORT`     | Puerto del servidor                  | `3000`        |
| `NODE_ENV` | Entorno (`development` / `production`) | `development` |

## Path aliases

Los imports usan el alias `@/*` mapeado a `src/*`:

```typescript
import { env } from '@/config/env.js';
```

En desarrollo, `tsx` resuelve los aliases automáticamente. En producción, `tsc-alias` los reescribe en `dist/`.

## Despliegue en Railway

1. Conecta el repositorio en [Railway](https://railway.app).
2. Railway detecta Node/pnpm vía Nixpacks (configurado en `railway.json`).
3. El health check apunta a `GET /health`.
4. `PORT` lo asigna Railway automáticamente; no hace falta definirla manualmente.

Flujo de deploy: `pnpm install` → `pnpm build` → `pnpm start`.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check (Railway) |
| POST | `/notifications` | Enviar notificaciones |
| GET | `/cron-jobs` | Listar cron jobs (paginado) |
| POST | `/cron-jobs` | Crear cron job |
| GET | `/cron-jobs/:id` | Detalle de cron job |
| PATCH | `/cron-jobs/:id` | Editar cron job |
| DELETE | `/cron-jobs/:id` | Eliminar cron job |
| POST | `/cron-jobs/:id/pause` | Pausar cron job |
| POST | `/cron-jobs/:id/resume` | Reanudar cron job |
| POST | `/cron-jobs/:id/run` | Ejecutar cron job manualmente |
| GET | `/cron-jobs/:id/runs` | Historial de ejecuciones |
| POST | `/webhooks/twilio/whatsapp` | Webhook de WhatsApp entrante (Twilio) |

Rutas bajo `/notifications` y `/cron-jobs` requieren header `x-api-key`. Ver [`src/jobs/README.md`](src/jobs/README.md) para la guia completa de cron jobs.

El webhook `/webhooks/twilio/whatsapp` no usa `x-api-key`: se autentica validando el header `X-Twilio-Signature` (configurable con `TWILIO_VALIDATE_SIGNATURE`). Configura su URL publica en la consola de Twilio. Al recibir la palabra clave `REVISAR`, consulta el contrato en Odoo por el serial enviado y responde por WhatsApp.
