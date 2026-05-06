# 🔐 Auth — `/api/v1/auth`

> Autenticación, gestión de contraseña, perfil y sesión del usuario.
> Firebase es un detalle de implementación del backend — el frontend nunca interactúa directamente con Firebase.

---

## Flujo de Autenticación

```
Frontend                         Backend                          Firebase
   |                                |                                |
   |-- POST /auth/login ----------->|                                |
   |   (email + password)           |-- signInWithPassword --------->|
   |                                |<-- idToken + refreshToken -----|
   |                                |                                |
   |                                | 1. Valida idToken              |
   |                                | 2. Guarda refreshToken         |
   |                                |    encriptado en user_devices  |
   |                                | 3. Genera JWT custom (15 min)  |
   |                                |                                |
   |<-- JWT custom + user ----------|                                |
   |                                |                                |
   | (15 min después, JWT expira)   |                                |
   |                                |                                |
   |-- POST /auth/refresh -------->|                                |
   |   (X-Device-Id en header)      |-- Busca refreshToken del      |
   |                                |   dispositivo en BD            |
   |                                |-- Token exchange -------------->|
   |                                |<-- Nuevo idToken --------------|
   |                                |                                |
   |                                | 1. Genera nuevo JWT custom     |
   |                                |                                |
   |<-- Nuevo JWT custom -----------|                                |
```

### Reglas de seguridad

- El `refreshToken` de Firebase **nunca** sale del backend. Se almacena encriptado en `user_devices`.
- El JWT custom tiene vida corta (15 min). El frontend lo almacena en memoria o AsyncStorage.
- El refresh es transparente: el frontend detecta un `401` y llama a `/auth/refresh` automáticamente.
- Al hacer logout, el backend elimina el `refreshToken` y el registro del dispositivo.

---

## Resumen de Endpoints

| Emoji | Método  | Ruta                     | Auth | Descripción                                         |
| :---: | ------- | ------------------------ | :--: | --------------------------------------------------- |
|  🟡   | `POST`  | `/auth/register`         |  ❌  | Registro con email y contraseña.                    |
|  🟡   | `POST`  | `/auth/login`            |  ❌  | Login con email y contraseña.                       |
|  🟡   | `POST`  | `/auth/login/google`     |  ❌  | Login con token de Google/Firebase.                 |
|  🟡   | `POST`  | `/auth/refresh`          |  ❌  | Renovación de JWT usando refresh token del backend. |
|  🟡   | `POST`  | `/auth/recover-password` |  ❌  | Envío de email de recuperación.                     |
|  🟡   | `POST`  | `/auth/change-password`  |  ✅  | Cambio de contraseña.                               |
|  🟢   | `GET`   | `/auth/profile`          |  ✅  | Obtener perfil del usuario.                         |
|  🟠   | `PATCH` | `/auth/profile`          |  ✅  | Actualizar datos del perfil.                        |
|  🟡   | `POST`  | `/auth/logout`           |  ✅  | Cerrar sesión y eliminar device token.              |

> **Nota:** Todas las rutas llevan el prefijo `/api/v1`. Los headers `X-Device-Id` y `X-Device-Name` son obligatorios en todos los endpoints de auth (excepto `recover-password`). Los endpoints con Auth ✅ requieren además `Authorization: Bearer {jwt}`.

---

## Endpoints

### 🟡 `POST /auth/register`

> Registro de nuevo usuario. El backend crea la cuenta en Firebase, almacena el refresh token y devuelve un JWT custom.

**Auth:** ❌ Pública
**Headers:** `X-Device-Id`, `X-Device-Name`

**Request Body:**

```json
{
  "email": "string",
  "password": "string",
  "first_name": "string | null",
  "last_name": "string | null"
}
```

**Response `201 Created`:**

```json
{
  "access_token": "string (JWT custom, 15 min)",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "string",
    "first_name": "string | null",
    "last_name": "string | null",
    "avatar_url": null,
    "subscription_plan": "FREE",
    "country_code": "VE"
  }
}
```

> El `refreshToken` de Firebase se almacena en `user_devices` asociado al `X-Device-Id`. Nunca se envía al frontend.

**Errores posibles:** `400`, `401`, `422`

---

### 🟡 `POST /auth/login`

> Login con email y contraseña. El backend autentica contra Firebase, almacena/actualiza el refresh token y devuelve un JWT custom.

**Auth:** ❌ Pública
**Headers:** `X-Device-Id`, `X-Device-Name`

**Request Body:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response `200 OK`:**

```json
{
  "access_token": "string (JWT custom, 15 min)",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "string",
    "first_name": "string | null",
    "last_name": "string | null",
    "avatar_url": "string | null",
    "subscription_plan": "string",
    "country_code": "string"
  }
}
```

**Flujo interno:**

1. Backend llama a Firebase REST API `signInWithPassword`.
2. Firebase devuelve `idToken` + `refreshToken`.
3. Backend valida el `idToken`, busca/crea el usuario en BD.
4. Guarda `refreshToken` encriptado en `user_devices` (upsert por `X-Device-Id`).
5. Genera JWT custom con `userId`, `email`, `role` y expira en 15 min.
6. Devuelve el JWT custom + datos del usuario.

**Errores posibles:** `400`, `401`

---

### 🟡 `POST /auth/login/google`

> Login con token de Google vía Firebase. Mismo flujo que login manual pero el frontend envía el `idToken` de Google.

**Auth:** ❌ Pública
**Headers:** `X-Device-Id`, `X-Device-Name`

**Request Body:**

```json
{
  "google_id_token": "string"
}
```

**Response `200 OK`:**

```json
{
  "access_token": "string (JWT custom, 15 min)",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "string",
    "first_name": "string | null",
    "last_name": "string | null",
    "avatar_url": "string | null",
    "subscription_plan": "string",
    "country_code": "string"
  }
}
```

**Flujo interno:**

1. Backend verifica el `google_id_token` con Firebase Admin SDK.
2. Si el usuario no existe, lo crea en BD (auto-registro).
3. Obtiene `refreshToken` de Firebase vía token exchange.
4. Guarda `refreshToken` encriptado en `user_devices`.
5. Genera JWT custom y devuelve.

**Errores posibles:** `400`, `401`

---

### 🟡 `POST /auth/refresh`

> Renueva el JWT custom. El backend usa el refresh token almacenado en BD para obtener un nuevo idToken de Firebase y genera un nuevo JWT.

**Auth:** ❌ Pública (el JWT puede estar expirado)
**Headers:** `X-Device-Id`, `X-Device-Name`

**Request Body:** _(vacío)_

**Response `200 OK`:**

```json
{
  "access_token": "string (nuevo JWT custom, 15 min)",
  "expires_in": 900
}
```

**Flujo interno:**

1. Backend busca el `firebase_refresh_token` en `user_devices` usando `X-Device-Id`.
2. Llama a Firebase REST API `token` endpoint con el refresh token.
3. Firebase devuelve un nuevo `idToken` (y opcionalmente un nuevo `refreshToken`).
4. Si Firebase devuelve nuevo `refreshToken`, actualiza en BD.
5. Genera nuevo JWT custom y devuelve.

**Errores posibles:** `400`, `401`, `404`

> **Importante:** Si Firebase revoca el refresh token (por cambio de contraseña, deshabilitación de cuenta, etc.), este endpoint devuelve `401` y el frontend debe redirigir al login.

---

### 🟡 `POST /auth/recover-password`

> Envía email de recuperación de contraseña vía Firebase.

**Auth:** ❌ Pública
**Headers:** Ninguno requerido

**Request Body:**

```json
{
  "email": "string"
}
```

**Response `204 No Content`**

_(Sin body — el HTTP status confirma el envío.)_

**Errores posibles:** `400`, `422`

---

### 🟡 `POST /auth/change-password`

> Cambio de contraseña del usuario autenticado. Revoca todos los refresh tokens del usuario en Firebase, forzando re-login en otros dispositivos.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Request Body:**

```json
{
  "current_password": "string",
  "new_password": "string"
}
```

**Response `204 No Content`**

_(Sin body — el HTTP status confirma el cambio.)_

**Flujo interno:**

1. Backend verifica `current_password` contra Firebase.
2. Actualiza la contraseña en Firebase.
3. Revoca refresh tokens de Firebase (`revokeRefreshTokens`).
4. Elimina todos los `firebase_refresh_token` de `user_devices` del usuario excepto el dispositivo actual.
5. Genera nuevo refresh token para el dispositivo actual.

**Errores posibles:** `400`, `401`, `422`

---

### 🟢 `GET /auth/profile`

> Obtiene los datos del perfil del usuario autenticado.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Response `200 OK`:**

```json
{
  "id": "uuid",
  "email": "string",
  "first_name": "string | null",
  "last_name": "string | null",
  "avatar_url": "string | null",
  "subscription_plan": "string",
  "country_code": "string"
}
```

**Errores posibles:** `401`, `404`

---

### 🟠 `PATCH /auth/profile`

> Actualización parcial de datos del perfil.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Request Body:**

```json
{
  "first_name": "string | null",
  "last_name": "string | null",
  "avatar_url": "string | null",
  "country_code": "string | null",
  "latitude": "number | null",
  "longitude": "number | null"
}
```

**Response `200 OK`:**

```json
{
  "id": "uuid",
  "email": "string",
  "first_name": "string",
  "last_name": "string",
  "avatar_url": "string | null",
  "subscription_plan": "string",
  "country_code": "string"
}
```

> Regla: la mutación devuelve el DTO canónico actualizado.

**Errores posibles:** `400`, `401`, `422`

---

### 🟡 `POST /auth/logout`

> Cierra sesión del dispositivo actual. Elimina el refresh token y el registro del dispositivo.

**Auth:** ✅ Bearer token
**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`

**Response `204 No Content`**

_(Sin body — el HTTP status confirma el cierre de sesión.)_

**Flujo interno:**

1. Backend busca `user_devices` por `user_id` + `X-Device-Id`.
2. Elimina el registro (refresh token + FCM token).
3. Opcionalmente revoca el refresh token en Firebase para ese dispositivo.

**Errores posibles:** `401`, `404`
