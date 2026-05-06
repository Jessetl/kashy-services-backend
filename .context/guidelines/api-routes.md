# 📡 API REST — Índice de Servicios

> Catálogo centralizado de todos los endpoints del backend de Kashy.
> Cada servicio tiene su propio archivo `.md` en la carpeta `router/`.

---

## Convenciones Generales

### Estructura de URL

```
{baseUrl}/api/{version}/{service}/{action?}
```

| Segmento    | Descripción                                                      | Ejemplo                    |
| ----------- | ---------------------------------------------------------------- | -------------------------- |
| `{baseUrl}` | Dominio base del servidor                                        | `https://api.kashy.app`    |
| `api`       | Prefijo fijo que identifica la API REST                          | `api`                      |
| `{version}` | Versión del endpoint (`v1`, `v2`…)                               | `v1`                       |
| `{service}` | Dominio lógico del recurso                                       | `auth`, `shopping-lists`   |
| `{action?}` | Acción específica _(opcional si el verbo HTTP ya es suficiente)_ | `login`, `change-password` |

### Versionado

- Siempre incluir la versión en la URL (`/api/v1/...`).
- Al crear una nueva versión incompatible, documentarla en un archivo separado.
- Las versiones anteriores se mantienen activas hasta deprecación explícita.

---

## Seguridad — Headers Obligatorios

### Identificación de Dispositivo

Todas las peticiones a la API **deben** incluir headers que identifiquen al dispositivo (excepto las rutas públicas marcadas explícitamente).

| Header          | Value          | Requerido | Descripción                                   |
| --------------- | -------------- | :-------: | --------------------------------------------- |
| `X-Device-Id`   | `{deviceId}`   |    ✅     | Identificador único del dispositivo.          |
| `X-Device-Name` | `{deviceName}` |    ✅     | Nombre legible del dispositivo, SO y versión. |

#### Formato de `X-Device-Name`

```
[OS] [VERSION] [MARCA] [MODEL]
```

| Plataforma | Ejemplo                         |
| ---------- | ------------------------------- |
| Android    | `Android 14 Samsung Galaxy S24` |
| iOS        | `iOS 17.4 Apple iPhone 15 Pro`  |

> El formato no es validado por el backend — es informativo para soporte y auditoría.

### Autenticación — Bearer Token

| Método           | Header                          | Descripción                               |
| ---------------- | ------------------------------- | ----------------------------------------- |
| **Bearer Token** | `Authorization: Bearer {token}` | Token JWT obtenido del endpoint de login. |

- Los endpoints públicos **no** requieren `Authorization` ni headers de dispositivo.
- Cualquier endpoint protegido que reciba un token inválido o expirado responde con `401 Unauthorized`.

---

## Rutas Públicas

Las siguientes rutas **no requieren** `Authorization`, `X-Device-Id` ni `X-Device-Name`.

| Método   | Ruta                            | Descripción                |
| -------- | ------------------------------- | -------------------------- |
| 🟢 `GET` | `/api/v1/health`                | Health check del servidor. |
| 🟢 `GET` | `/api/v1/exchange-rate/current` | Tasa de cambio actual.     |

---

## Content-Type

- **Request:** `application/json` (salvo endpoints de upload).
- **Response:** `application/json`.

---

## Paginación

Todos los endpoints de listado están paginados. Los filtros se envían por `POST` con los criterios en el body.

```json
{
  "page": 1,
  "limit": 20,
  "filters": {}
}
```

| Campo     | Tipo    | Requerido | Descripción                       |
| --------- | ------- | :-------: | --------------------------------- |
| `page`    | Integer |    ✅     | Número de página (desde 1).       |
| `limit`   | Integer |    ✅     | Cantidad de registros por página. |
| `filters` | Object  |    ❌     | Filtros específicos del recurso.  |

**Response paginada:**

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

## Formato y Catálogo de Errores

Todos los errores siguen estructuras estandarizadas según su código HTTP. Cada endpoint indica qué códigos puede retornar, pero la estructura se define aquí una sola vez.

#### `400 Bad Request`

> Faltan campos obligatorios o el body tiene un formato inválido.

```json
{
  "error": "Bad Request",
  "message": "El campo 'email' es obligatorio."
}
```

#### `401 Unauthorized`

> Token ausente, expirado o inválido. También aplica cuando las credenciales son incorrectas.

```json
{
  "error": "Unauthorized",
  "message": "Credenciales inválidas. Verifique su usuario y contraseña."
}
```

#### `404 Not Found`

> El recurso solicitado no existe.

```json
{
  "error": "Not Found",
  "message": "El recurso solicitado no existe."
}
```

#### `422 Unprocessable Entity`

> Los datos enviados no pasan las validaciones de negocio.

```json
{
  "error": "Unprocessable Entity",
  "message": "Los datos enviados no son válidos.",
  "fields": [
    {
      "field": "email",
      "value": "example@mail.",
      "error": "Debe ser un email válido"
    }
  ]
}
```

| Campo            | Tipo      | Siempre presente | Descripción                       |
| ---------------- | --------- | :--------------: | --------------------------------- |
| `error`          | `String`  |        ✅        | Tipo de error HTTP.               |
| `message`        | `String`  |        ✅        | Descripción general del problema. |
| `fields`         | `Array`   |  Solo en `422`   | Lista de campos con error.        |
| `fields[].field` | `String`  |        ✅        | Nombre del campo que falló.       |
| `fields[].value` | `String?` |        ✅        | Valor enviado. Puede ser `null`.  |
| `fields[].error` | `String`  |        ✅        | Mensaje de error específico.      |

#### `500 Internal Server Error`

```json
{
  "error": "Internal Server Error",
  "message": "Ha ocurrido un error inesperado. Intente más tarde."
}
```

#### `503 Service Unavailable`

```json
{
  "error": "Service Unavailable",
  "message": "El servicio no está disponible en este momento."
}
```

#### Errores Transversales

Los siguientes errores pueden ocurrir en **cualquier** endpoint y **no se repiten** en la documentación individual:

| Código | Nombre                | Cuándo ocurre                             |
| ------ | --------------------- | ----------------------------------------- |
| `500`  | Internal Server Error | Error inesperado del servidor.            |
| `503`  | Service Unavailable   | Servidor en mantenimiento o sobrecargado. |

> Los errores `400`, `401`, `404`, `422` se listan **por endpoint** (solo los aplicables).

---

## Convenciones de Respuesta

| Naturaleza del endpoint                           | Status code      | Body                          |
| ------------------------------------------------- | ---------------- | ----------------------------- |
| Consulta de recurso (`GET`)                       | `200 OK`         | DTO canónico del recurso.     |
| Mutación que modifica un recurso (`POST`/`PATCH`) | `200 OK`         | DTO canónico **actualizado**. |
| Creación de recurso (`POST` que crea)             | `201 Created`    | DTO canónico recién creado.   |
| Mutación sin datos útiles para la UI              | `204 No Content` | _(sin body)_                  |
| Eliminación                                       | `204 No Content` | _(sin body)_                  |

### Reglas de oro

1. **Las mutaciones devuelven el recurso actualizado.** El cliente no debería hacer un `GET` adicional para conocer el nuevo estado.
2. **El HTTP status es la confirmación. No `{ "message": "..." }`.** Las respuestas de éxito nunca incluyen prosa para la UI. La internacionalización es responsabilidad del cliente.
3. **El DTO canónico es la única fuente de verdad del shape del recurso.** Mantener un único DTO reutilizado por todos los endpoints que devuelven ese recurso.

---

## Leyenda Visual

| Emoji | Verbo    | Uso típico                  |
| ----- | -------- | --------------------------- |
| 🟢    | `GET`    | Obtener recursos (lectura). |
| 🟡    | `POST`   | Crear recursos o acciones.  |
| 🟠    | `PATCH`  | Actualización parcial.      |
| 🔴    | `DELETE` | Eliminar recurso.           |

---

## Catálogo de Servicios

| Servicio           | Archivo                                                  | Descripción                                                       | Estado      |
| ------------------ | -------------------------------------------------------- | ----------------------------------------------------------------- | ----------- |
| **Auth**           | [`router/authentication.md`](./router/authentication.md) | Registro, login, Google, contraseña, perfil, logout.              | 📝 Borrador |
| **Shopping Lists** | [`router/shopping-lists.md`](./router/shopping-lists.md) | CRUD de listas de compras (batch items). Comparadora de métricas. | 📝 Borrador |
| **Finances**       | [`router/finances.md`](./router/finances.md)             | CRUD de ingresos/egresos. Recurrencia, recordatorios y summary.   | 📝 Borrador |
| **Notifications**  | [`router/notifications.md`](./router/notifications.md)   | Listado, lectura, eliminación de notificaciones y preferencias.   | 📝 Borrador |

> **Estados:** 📝 Borrador · ⏳ Pendiente · ✅ Definido · 🚧 En desarrollo · ✔️ Implementado
