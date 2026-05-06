# 💰 Finances — `/api/v1/finances`

> CRUD de registros financieros (ingresos y egresos) con soporte para recurrencia automática y recordatorios.
> Todas las operaciones son exclusivas del rol KASHY (autenticado).

---

## Lógica de Recordatorios y Recurrencia

### Recordatorios automáticos

- Al crear o actualizar un registro financiero con `date` (fecha de vencimiento), el backend crea automáticamente una notificación programada **1 día antes** de esa fecha.
- Si el registro ya tenía una notificación `PENDING` y se actualiza la fecha, se reprograma la notificación.
- Si se elimina el registro, se eliminan todas sus notificaciones asociadas.

### Recurrencia automática

- Si un registro tiene `is_recurring: true` y `recurrence_day` (1-31), el backend genera automáticamente:
  1. Un nuevo `financial_record` cada mes en el `recurrence_day`.
  2. Una notificación programada 1 día antes del nuevo registro.
- El proceso de recurrencia se ejecuta vía un cron job / scheduler en el backend.
- Si `recurrence_day` es 31 y el mes tiene menos días, se usa el último día del mes.

---

## Resumen de Endpoints

| Emoji | Método   | Ruta                | Auth | Descripción                                                         |
| :---: | -------- | ------------------- | :--: | ------------------------------------------------------------------- |
|  🟡   | `POST`   | `/finances`         |  ✅  | Crear un registro financiero.                                       |
|  🟡   | `POST`   | `/finances/search`  |  ✅  | Listar registros con filtros y paginación.                          |
|  🟢   | `GET`    | `/finances/:id`     |  ✅  | Obtener detalle de un registro.                                     |
|  🟠   | `PATCH`  | `/finances/:id`     |  ✅  | Actualizar un registro.                                             |
|  🔴   | `DELETE` | `/finances/:id`     |  ✅  | Eliminar un registro y sus notificaciones.                          |
|  🟢   | `GET`    | `/finances/summary` |  ✅  | Resumen del mes: balance, ingresos, egresos, próximos vencimientos. |

> **Nota:** Todas las rutas llevan el prefijo `/api/v1`. Los headers `Authorization`, `X-Device-Id` y `X-Device-Name` son obligatorios en todos los endpoints.

---

## Endpoints

### 🟡 `POST /finances`

> Crea un registro financiero (ingreso o egreso). Si tiene fecha de vencimiento, se crea automáticamente un recordatorio 1 día antes. Si es recurrente, el backend se encarga de generar los siguientes registros.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Request Body:**

```json
{
  "type": "INCOME | EXPENSE",
  "title": "string",
  "description": "string | null",
  "amount_local": 0.0,
  "amount_usd": 0.0,
  "priority": "HIGH | MEDIUM | LOW | null",
  "interest_rate": 0.0,
  "date": "2026-06-15",
  "is_recurring": false,
  "recurrence_day": "integer (1-31) | null"
}
```

**Response `201 Created`:**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "EXPENSE",
  "title": "string",
  "description": "string | null",
  "amount_local": 0.0,
  "amount_usd": 0.0,
  "priority": "HIGH | null",
  "interest_rate": 0.0,
  "date": "2026-06-15",
  "is_recurring": false,
  "recurrence_day": null,
  "notification": {
    "id": "uuid",
    "scheduled_at": "2026-06-14",
    "status": "PENDING"
  }
}
```

> Si `date` está presente, el response incluye el objeto `notification` con la fecha programada (1 día antes). Si `date` es `null`, no se crea notificación y el campo `notification` es `null`.

**Flujo interno:**

1. Crea el `financial_record`.
2. Si `date` no es `null`, crea una `notification` con `scheduled_at = date - 1 día` y `status = PENDING`.
3. Si `is_recurring: true`, registra el `recurrence_day` para el cron job.

**Errores posibles:** `400`, `401`, `422`

---

### 🟡 `POST /finances/search`

> Lista los registros financieros del usuario con filtros y paginación.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Request Body:**

```json
{
  "page": 1,
  "limit": 20,
  "filters": {
    "type": "INCOME | EXPENSE | null",
    "priority": "HIGH | MEDIUM | LOW | null",
    "is_recurring": "boolean | null",
    "date_from": "date | null",
    "date_to": "date | null"
  }
}
```

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "EXPENSE",
      "title": "string",
      "amount_local": 0.0,
      "amount_usd": 0.0,
      "priority": "HIGH | null",
      "date": "2026-06-15",
      "is_recurring": false,
      "notification_status": "PENDING | SENT | FAILED | null"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 35,
    "total_pages": 2
  }
}
```

> El listado devuelve un resumen de cada registro con el estado de su notificación. No incluye `description`, `interest_rate` ni detalle completo para mantener el payload liviano.

**Errores posibles:** `400`, `401`

---

### 🟢 `GET /finances/:id`

> Obtiene el detalle completo de un registro financiero con su notificación asociada.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Response `200 OK`:**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "EXPENSE",
  "title": "string",
  "description": "string | null",
  "amount_local": 0.0,
  "amount_usd": 0.0,
  "priority": "HIGH | null",
  "interest_rate": 0.0,
  "date": "2026-06-15",
  "is_recurring": true,
  "recurrence_day": 15,
  "notification": {
    "id": "uuid",
    "scheduled_at": "2026-06-14",
    "sent_at": "2026-06-14 | null",
    "status": "PENDING"
  }
}
```

> Si el registro no tiene notificación, `notification` es `null`.

**Errores posibles:** `400`, `401`, `404`

---

### 🟠 `PATCH /finances/:id`

> Actualiza un registro financiero. Si se cambia la `date`, se reprograma la notificación automáticamente.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Request Body:**

```json
{
  "type": "INCOME | EXPENSE | null",
  "title": "string | null",
  "description": "string | null",
  "amount_local": "number | null",
  "amount_usd": "number | null",
  "priority": "HIGH | MEDIUM | LOW | null",
  "interest_rate": "number | null",
  "date": "date | null",
  "is_recurring": "boolean | null",
  "recurrence_day": "integer (1-31) | null"
}
```

**Response `200 OK`:**

> Devuelve el DTO canónico completo del registro con su notificación (mismo shape que `GET /finances/:id`).

**Flujo interno:**

1. Actualiza los campos del `financial_record` que vengan en el body.
2. Si `date` cambió y tenía notificación `PENDING`, actualiza `scheduled_at = nueva date - 1 día`.
3. Si `date` cambió y no tenía notificación, crea una nueva.
4. Si `date` se envía como `null`, elimina la notificación `PENDING` existente.
5. Si `is_recurring` cambia a `false`, limpia `recurrence_day`.

**Errores posibles:** `400`, `401`, `404`, `422`

---

### 🔴 `DELETE /finances/:id`

> Elimina un registro financiero y todas sus notificaciones asociadas.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Response `204 No Content`**

_(Sin body — el HTTP status confirma la eliminación.)_

**Flujo interno:**

1. Elimina todas las `notifications` asociadas al registro.
2. Elimina el `financial_record`.
3. Transacción única.

**Errores posibles:** `400`, `401`, `404`

---

### 🟢 `GET /finances/summary`

> Resumen financiero del mes actual del usuario. Usado por el Dashboard para mostrar balance neto, totales y próximos vencimientos.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Query Params:**

| Param   | Tipo           | Requerido | Descripción                           |
| ------- | -------------- | :-------: | ------------------------------------- |
| `month` | Integer (1-12) |    ❌     | Mes a consultar. Default: mes actual. |
| `year`  | Integer        |    ❌     | Año a consultar. Default: año actual. |

**Response `200 OK`:**

```json
{
  "month": 6,
  "year": 2026,
  "total_income_local": 0.0,
  "total_income_usd": 0.0,
  "total_expense_local": 0.0,
  "total_expense_usd": 0.0,
  "net_balance_local": 0.0,
  "net_balance_usd": 0.0,
  "upcoming_expenses": [
    {
      "id": "uuid",
      "title": "string",
      "amount_local": 0.0,
      "amount_usd": 0.0,
      "date": "2026-06-15",
      "priority": "HIGH | null"
    },
    {
      "id": "uuid",
      "title": "string",
      "amount_local": 0.0,
      "amount_usd": 0.0,
      "date": "2026-06-20",
      "priority": "MEDIUM | null"
    },
    {
      "id": "uuid",
      "title": "string",
      "amount_local": 0.0,
      "amount_usd": 0.0,
      "date": "2026-06-28",
      "priority": "LOW | null"
    }
  ]
}
```

> `upcoming_expenses` devuelve los próximos 3 egresos por vencer (ordenados por fecha ascendente). Solo incluye egresos con `date >= hoy`.

**Errores posibles:** `400`, `401`
