# 🛒 Shopping Lists — `/api/v1/shopping-lists`

> CRUD de listas de compras con items en batch, comparadora de métricas entre listas y soporte multi-moneda.
> Todas las operaciones son exclusivas del rol KASHY (autenticado). El guest opera solo en local (AsyncStorage).

---

## Resumen de Endpoints

| Emoji | Método   | Ruta                      | Auth | Descripción                                    |
| :---: | -------- | ------------------------- | :--: | ---------------------------------------------- |
|  🟡   | `POST`   | `/shopping-lists`         |  ✅  | Crear lista con todos sus items.               |
|  🟡   | `POST`   | `/shopping-lists/search`  |  ✅  | Listar listas con filtros y paginación.        |
|  🟢   | `GET`    | `/shopping-lists/:id`     |  ✅  | Obtener detalle de una lista con sus items.    |
|  🟠   | `PATCH`  | `/shopping-lists/:id`     |  ✅  | Actualizar lista y reemplazar items completos. |
|  🔴   | `DELETE` | `/shopping-lists/:id`     |  ✅  | Eliminar una lista y todos sus items.          |
|  🟡   | `POST`   | `/shopping-lists/compare` |  ✅  | Comparar productos entre 2 listas.             |

> **Nota:** Todas las rutas llevan el prefijo `/api/v1`. Los headers `Authorization`, `X-Device-Id` y `X-Device-Name` son obligatorios en todos los endpoints.

---

## Endpoints

### 🟡 `POST /shopping-lists`

> Crea una lista de compras con todos sus items en una sola transacción.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Request Body:**

```json
{
  "name": "string",
  "store_name": "string | null",
  "list_type": "TEMPLATE | RECEIPT",
  "country_code": "string",
  "currency_code": "string",
  "exchange_rate_snapshot": 0.0,
  "iva_enabled": false,
  "scheduled_date": "timestamp | null",
  "latitude": 0.0,
  "longitude": 0.0,
  "items": [
    {
      "product_name": "string",
      "category": "string",
      "quantity": 1,
      "unit_price_local": 0.0,
      "unit_price_usd": 0.0,
      "is_checked": false
    }
  ]
}
```

**Response `201 Created`:**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "store_name": "string | null",
  "list_type": "TEMPLATE",
  "country_code": "string",
  "currency_code": "string",
  "exchange_rate_snapshot": 0.0,
  "iva_enabled": false,
  "scheduled_date": "timestamp | null",
  "latitude": 0.0,
  "longitude": 0.0,
  "is_active": true,
  "items": [
    {
      "id": "uuid",
      "product_name": "string",
      "category": "string",
      "quantity": 1,
      "unit_price_local": 0.0,
      "unit_price_usd": 0.0,
      "is_checked": false
    }
  ]
}
```

> La lista y todos sus items se crean en una sola transacción. Si falla un item, no se crea nada.

**Errores posibles:** `400`, `401`, `422`

---

### 🟡 `POST /shopping-lists/search`

> Lista las listas de compras del usuario con filtros y paginación.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Request Body:**

```json
{
  "page": 1,
  "limit": 20,
  "filters": {
    "list_type": "TEMPLATE | RECEIPT | null",
    "store_name": "string | null",
    "is_active": "boolean | null",
    "scheduled_date_from": "timestamp | null",
    "scheduled_date_to": "timestamp | null"
  }
}
```

**Response `200 OK`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "store_name": "string | null",
      "list_type": "TEMPLATE",
      "currency_code": "string",
      "is_active": true,
      "scheduled_date": "timestamp | null",
      "items_count": 12,
      "checked_count": 5
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

> El listado devuelve un resumen de cada lista con conteo de items y marcados. No incluye el detalle de items para mantener el payload liviano.

**Errores posibles:** `400`, `401`

---

### 🟢 `GET /shopping-lists/:id`

> Obtiene el detalle completo de una lista con todos sus items.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Response `200 OK`:**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "store_name": "string | null",
  "list_type": "TEMPLATE",
  "country_code": "string",
  "currency_code": "string",
  "exchange_rate_snapshot": 0.0,
  "iva_enabled": false,
  "scheduled_date": "timestamp | null",
  "latitude": 0.0,
  "longitude": 0.0,
  "is_active": true,
  "items": [
    {
      "id": "uuid",
      "product_name": "string",
      "category": "string",
      "quantity": 1,
      "unit_price_local": 0.0,
      "unit_price_usd": 0.0,
      "is_checked": false
    }
  ]
}
```

**Errores posibles:** `400`, `401`, `404`

---

### 🟠 `PATCH /shopping-lists/:id`

> Actualiza los datos de la lista y reemplaza todos los items. El array de items enviado sustituye completamente a los anteriores (delete + insert en una sola transacción).

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Request Body:**

```json
{
  "name": "string | null",
  "store_name": "string | null",
  "list_type": "TEMPLATE | RECEIPT | null",
  "currency_code": "string | null",
  "exchange_rate_snapshot": "number | null",
  "iva_enabled": "boolean | null",
  "scheduled_date": "timestamp | null",
  "latitude": "number | null",
  "longitude": "number | null",
  "is_active": "boolean | null",
  "items": [
    {
      "product_name": "string",
      "category": "string",
      "quantity": 1,
      "unit_price_local": 0.0,
      "unit_price_usd": 0.0,
      "is_checked": false
    }
  ]
}
```

**Response `200 OK`:**

> Devuelve el DTO canónico completo de la lista con los items actualizados (mismo shape que `GET /shopping-lists/:id`).

**Flujo interno:**

1. Actualiza los campos de la lista que vengan en el body.
2. Elimina todos los `shopping_items` existentes de esa lista.
3. Inserta los nuevos items del array.
4. Todo en una sola transacción — si falla, rollback completo.

**Errores posibles:** `400`, `401`, `404`, `422`

---

### 🔴 `DELETE /shopping-lists/:id`

> Elimina una lista y todos sus items asociados.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Response `204 No Content`**

_(Sin body — el HTTP status confirma la eliminación.)_

**Flujo interno:**

1. Elimina todos los `shopping_items` de la lista.
2. Elimina la `shopping_list`.
3. Transacción única.

**Errores posibles:** `400`, `401`, `404`

---

### 🟡 `POST /shopping-lists/compare`

> Compara los productos entre 2 listas. Cruza por nombre de producto: los que hacen match muestran la diferencia de precio, los que no coinciden se muestran separados por lista de origen.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Request Body:**

```json
{
  "list_a_id": "uuid",
  "list_b_id": "uuid"
}
```

**Response `200 OK`:**

```json
{
  "list_a": {
    "id": "uuid",
    "name": "string",
    "store_name": "string | null"
  },
  "list_b": {
    "id": "uuid",
    "name": "string",
    "store_name": "string | null"
  },
  "matched_items": [
    {
      "product_name": "string",
      "category": "string",
      "list_a_price_local": 0.0,
      "list_a_price_usd": 0.0,
      "list_a_quantity": 1,
      "list_b_price_local": 0.0,
      "list_b_price_usd": 0.0,
      "list_b_quantity": 1,
      "price_diff_local": 0.0,
      "price_diff_usd": 0.0,
      "cheaper_in": "list_a | list_b | equal"
    }
  ],
  "unmatched_items": {
    "only_in_list_a": [
      {
        "product_name": "string",
        "category": "string",
        "quantity": 1,
        "unit_price_local": 0.0,
        "unit_price_usd": 0.0
      }
    ],
    "only_in_list_b": [
      {
        "product_name": "string",
        "category": "string",
        "quantity": 1,
        "unit_price_local": 0.0,
        "unit_price_usd": 0.0
      }
    ]
  },
  "summary": {
    "total_matched": 8,
    "total_unmatched_a": 2,
    "total_unmatched_b": 3,
    "list_a_total_local": 0.0,
    "list_b_total_local": 0.0,
    "savings_local": 0.0,
    "savings_usd": 0.0,
    "recommended": "list_a | list_b"
  }
}
```

> **Lógica de match:** se cruzan productos por `product_name` (case-insensitive, trim). Si un producto aparece en ambas listas, entra en `matched_items` con la diferencia de precio. Si solo aparece en una, va a `unmatched_items` bajo su lista de origen. El `summary` muestra totales y cuál lista es más económica en los productos que hacen match.

**Errores posibles:** `400`, `401`, `404`
