# Clasificaciones de plantillas

Las clasificaciones agrupan plantillas por tipo o dominio de negocio (por ejemplo `system`, `contracts`, `marketing`). Cada plantilla en `notification_templates` debe referenciar una clasificación mediante `classification_id`.

## Cuándo crear una clasificación

- Antes de dar de alta cualquier plantilla nueva, si no existe una clasificación adecuada.
- Cuando quieras organizar plantillas por área funcional sin mezclar identificadores de envío.

## Paso 1 — Listar clasificaciones existentes

```bash
curl -sS "$API_BASE/template-classifications" \
  -H "x-api-key: $SERVICE_API_KEY"
```

Respuesta esperada (estructura):

```json
{
  "code": "TEMPLATE_CLASSIFICATIONS_LISTED",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "system",
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "pagination": { "limit": 20, "offset": 0, "total": 1 }
  }
}
```

Si ya existe una clasificación que aplica, copia su `id` y salta al paso de creación de plantilla (email o WhatsApp).

## Paso 2 — Crear una clasificación

```bash
curl -sS -X POST "$API_BASE/template-classifications" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "name": "marketing"
  }'
```

### Validaciones

| Regla | Error si falla |
|-------|----------------|
| `name` no vacío (tras trim) | 400 VALIDATION |
| `name` único en toda la tabla | 409 TEMPLATE_CLASSIFICATION_NAME_EXISTS |

### Convención de nombres

- Usa nombres cortos en minúsculas: `system`, `contracts`, `onboarding`.
- Evita espacios; usa guiones si necesitas varias palabras: `order-updates`.

## Paso 3 — Consultar una clasificación por ID

```bash
curl -sS "$API_BASE/template-classifications/<uuid>" \
  -H "x-api-key: $SERVICE_API_KEY"
```

## Paso 4 — Actualizar una clasificación

```bash
curl -sS -X PATCH "$API_BASE/template-classifications/<uuid>" \
  -H "content-type: application/json" \
  -H "x-api-key: $SERVICE_API_KEY" \
  -d '{
    "name": "order-updates"
  }'
```

## Paso 5 — Eliminar una clasificación

```bash
curl -sS -X DELETE "$API_BASE/template-classifications/<uuid>" \
  -H "x-api-key: $SERVICE_API_KEY"
```

### Restricción

No se puede eliminar una clasificación si tiene plantillas asociadas. En ese caso recibirás **409 CLASSIFICATION_IN_USE**.

Para eliminarla:

1. Reasigna o elimina las plantillas que la usan (`PATCH` o `DELETE` en `/notification-templates/:id`).
2. Vuelve a intentar el `DELETE` de la clasificación.

## Siguiente paso

- [Alta de plantilla email](./email.md)
- [Alta de plantilla WhatsApp](./whatsapp.md)
