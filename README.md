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

| Método | Ruta      | Descripción              |
|--------|-----------|--------------------------|
| GET    | `/health` | Health check (Railway)   |
