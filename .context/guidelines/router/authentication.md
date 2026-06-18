# 🔐 Auth — `/auth`

> Endpoints de autenticación, contraseña, perfil y sesión.
> El frontend nunca interactúa con Firebase directamente — todo pasa por el backend.

> 🔄 **Flujo end-to-end (diagramas de secuencia):** ver [`flows/authentication.md`](../flows/authentication.md) — login, refresh automático, manejo global de `401`, change-password y logout.

> **Convención de nombrado:** Request y response usan **camelCase** en los keys JSON (`accessToken`, `firstName`, `avatarUrl`, `countryCode`, etc.). Los valores enum permanecen en `UPPER_SNAKE_CASE` (`FREE`).

---

## Almacenamiento de Tokens (Mobile)

> Kashy es mobile-only (React Native). No hay web.

| Dato            | Dónde guardar                                                                     | Notas                                                                                                         |
| --------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `refreshToken`  | **Keychain** (iOS) / **Keystore + EncryptedSharedPreferences** (Android)          | Usar `react-native-keychain` o `expo-secure-store`. Persiste entre reinicios y cierres de app. Es el crítico. |
| `accessToken`   | **Keychain** (iOS) / **Keystore** (Android) — misma lib                           | Persiste entre sesiones. Al abrir la app, si expiró (15 min), se dispara refresh automático.                  |
| `user`          | **Zustand** (memoria) + puede cachearse en Keychain/Keystore para arranque rápido | Se rehidrata al iniciar la app desde almacenamiento seguro o desde `GET /auth/profile`.                       |
| Preferencias UI | **AsyncStorage** — onboarding completado, tema, idioma, etc.                      | Datos no sensibles solamente.                                                                                 |

**Reglas:**

- **Prohibido** guardar tokens en `AsyncStorage`, `SharedPreferences` plain, `NSUserDefaults` o archivos sin cifrar.
- **No sincronizar** el `refreshToken` a iCloud Keychain ni Google Backup. El refresh es per-device.
- **Zustand** carga ambos tokens en memoria al iniciar la app (desde Keychain/Keystore). Durante la sesión activa se leen del store en memoria (rápido). Keychain/Keystore es la fuente de verdad persistente.
- Al recibir tokens del backend, siempre **sobrescribir** en Keychain/Keystore antes de actualizar Zustand.

---

## Resumen

| Emoji | Método  | Ruta                     | Auth | Descripción                                                                       |
| :---: | ------- | ------------------------ | :--: | --------------------------------------------------------------------------------- |
|  🟡   | `POST`  | `/auth/register`         |  ❌  | Registro con email y contraseña. No abre sesión — requiere verificación de email. |
|  🟡   | `POST`  | `/auth/login`            |  ❌  | Login con email y contraseña.                                                     |
|  🟡   | `POST`  | `/auth/login/google`     |  ❌  | Login con Google.                                                                 |
|  🟡   | `POST`  | `/auth/refresh`          |  ❌  | Renovar JWT expirado. Envía `refreshToken` en body + headers de dispositivo.      |
|  🟡   | `POST`  | `/auth/recover-password` |  ❌  | Enviar email de recuperación.                                                     |
|  🟡   | `POST`  | `/auth/change-password`  |  ✅  | Cambiar contraseña.                                                               |
|  🟢   | `GET`   | `/auth/profile`          |  ✅  | Obtener perfil.                                                                   |
|  🟠   | `PATCH` | `/auth/profile`          |  ✅  | Actualizar perfil.                                                                |
|  🟡   | `POST`  | `/auth/logout`           |  ✅  | Cerrar sesión.                                                                    |

> **Nota:** Todas las rutas llevan el prefijo `/api/v1` (ya incluido en `API_BASE_URL`). Los headers `X-Device-Id`, `X-Device-Name` y `X-Platform` (valores permitidos: `ios` | `android`) son obligatorios en todos los endpoints de auth (excepto `register` y `recover-password`). `X-App-Version` es opcional. Los endpoints con Auth ✅ requieren además `Authorization: Bearer {jwt}`.

---

## Endpoints

### 🟡 `POST /auth/register`

> No abre sesión. El usuario debe verificar su email y luego iniciar sesión vía `POST /auth/login`.

**Headers:** Ninguno requerido (no abre sesión, no requiere `X-Device-Id` / `X-Device-Name`).

**Enviar:**

```json
{
  "email": "string",
  "password": "string (min 8, max 64)",
  "firstName": "string (max 80)",
  "lastName": "string (max 80)",
  "countryCode": "string (ISO 3166-1 alpha-2, len 2)",
  "latitude": "number | null",
  "longitude": "number | null"
}
```

> **Campos requeridos:** `email`, `password`, `firstName`, `lastName`, `countryCode`.
> **Campos opcionales:** `latitude`, `longitude`.

**Esperar `201`:**

```json
{
  "message": "Usuario registrado. Revisa tu correo para verificar la cuenta antes de iniciar sesion.",
  "email": "string"
}
```

**Acción en frontend:**

1. Mostrar mensaje de confirmación: "Revisa tu correo para verificar tu cuenta".
2. Navegar a la pantalla de login.
3. **No guardar token ni abrir sesión** — el usuario debe verificar email primero.

**Errores:**

| Código | Qué hacer                                                                |
| :----- | :----------------------------------------------------------------------- |
| `400`  | Body malformado. Bug del frontend — revisar payload.                     |
| `409`  | Email ya registrado. Mostrar error en el campo email.                    |
| `422`  | Validación fallida. Mapear `fields[]` a errores por campo en formulario. |

---

### 🟡 `POST /auth/login`

**Headers:** `X-Device-Id`, `X-Device-Name`, `X-Platform` (`ios` | `android`), `X-App-Version` (opcional)

**Enviar:**

```json
{
  "email": "string",
  "password": "string"
}
```

**Esperar `200`:**

```json
{
  "accessToken": "string (JWT custom, 15 min)",
  "refreshToken": "string (Firebase refresh, larga vida)",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "string",
    "firstName": "string | null",
    "lastName": "string | null",
    "avatarUrl": "string | null",
    "subscriptionPlan": "string",
    "countryCode": "string",
    "latitude": "number | null",
    "longitude": "number | null"
  }
}
```

**Acción en frontend:**

1. Guardar `refreshToken` en Keychain/Keystore.
2. Guardar `accessToken` en Keychain/Keystore.
3. Cargar ambos tokens + `user` en Zustand (memoria).
4. Navegar a Dashboard con replace.

**Errores:**

| Código | Qué hacer                                                               |
| :----- | :---------------------------------------------------------------------- |
| `400`  | Body malformado. Bug del frontend — revisar payload.                    |
| `401`  | Credenciales inválidas o email no verificado. Mostrar error al usuario. |

---

### 🟡 `POST /auth/login/google`

**Headers:** `X-Device-Id`, `X-Device-Name`, `X-Platform` (`ios` | `android`), `X-App-Version` (opcional)

**Enviar:**

```json
{
  "googleIdToken": "string"
}
```

> El `googleIdToken` se obtiene usando Google Sign-In SDK en React Native. El frontend se autentica con Google, obtiene el token y lo envía al backend.

**Esperar `200`:**

```json
{
  "accessToken": "string (JWT custom, 15 min)",
  "refreshToken": "string (Firebase refresh, larga vida)",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "string",
    "firstName": "string | null",
    "lastName": "string | null",
    "avatarUrl": "string | null",
    "subscriptionPlan": "string",
    "countryCode": "string",
    "latitude": "number | null",
    "longitude": "number | null"
  }
}
```

**Acción en frontend:** Igual que login — guardar tokens en Keychain/Keystore, cargar en Zustand, navegar a Dashboard.

> **Nota:** En auto-registro vía Google, el backend asigna `countryCode = 'VE'` por defecto. El usuario puede actualizarlo vía `PATCH /auth/profile`.

**Errores:**

| Código | Qué hacer                                                        |
| :----- | :--------------------------------------------------------------- |
| `400`  | Token de Google inválido o malformado. Revisar integración.      |
| `401`  | Autenticación fallida contra Firebase. Mostrar error al usuario. |

---

### 🟡 `POST /auth/refresh`

> Renueva el JWT custom. El cliente envía su `refreshToken` (guardado en Keychain/Keystore) en el body. El backend lo intercambia con Firebase y devuelve un nuevo `accessToken` + el `refreshToken` rotado si Firebase entregó uno nuevo.

**Auth:** ❌ Pública (sin `Authorization` header). El propio `refreshToken` del body es el credencial; Firebase lo valida criptográficamente.

**Headers:**

- `X-Device-Id` — **Obligatorio**. Debe corresponder al dispositivo registrado en `user_devices`.
- `X-Device-Name` — **Obligatorio**.
- `X-Platform` — **Obligatorio**. Valores permitidos: `ios` | `android`.
- `X-App-Version` — Opcional. Version semver de la app (ej. `1.2.3`).

**Enviar:**

```json
{
  "refreshToken": "string (Firebase refresh actual del cliente)"
}
```

**Esperar `200`:**

```json
{
  "accessToken": "string (nuevo JWT custom, 15 min)",
  "refreshToken": "string (rotado si Firebase entregó uno nuevo, sino el mismo)",
  "expiresIn": 900
}
```

**Acción en frontend:**

1. **Sobrescribir** `refreshToken` en Keychain/Keystore con el devuelto en la respuesta (siempre, incluso si parece igual al anterior — Firebase puede rotarlo silenciosamente).
2. Guardar nuevo `accessToken` en Keychain/Keystore.
3. Actualizar ambos en Zustand.
4. Reintentar el request original que falló con `401`.

> **Rotación de refresh:** Usar el refresh viejo después de una rotación produce `401` en la siguiente llamada. Siempre sobrescribir antes de continuar.

**Errores:**

| Código | Qué hacer                                                                                                              |
| :----- | :--------------------------------------------------------------------------------------------------------------------- |
| `400`  | `refreshToken` ausente o vacío en el body. Bug del frontend — revisar payload.                                         |
| `401`  | Refresh token revocado, expirado o device binding fail (`X-Device-Id` no coincide). Limpiar Keychain/Keystore → login. |

> **Importante:** Si el backend responde `401`, el frontend debe borrar ambos tokens de Keychain/Keystore, limpiar Zustand y redirigir al login. No reintentar.

---

### 🟡 `POST /auth/recover-password`

**Headers:** Ninguno requerido.

**Enviar:**

```json
{
  "email": "string"
}
```

**Esperar:** `204 No Content` (sin body).

> **Siempre responde `204`**, incluso si el email no existe. Esto es intencional (anti-enumeración de usuarios).

**Acción en frontend:** Mostrar mensaje de confirmación: "Revisa tu correo". Navegar de vuelta al login.

**Errores:**

| Código | Qué hacer                                                 |
| :----- | :-------------------------------------------------------- |
| `400`  | Body no es JSON válido o falta `email`. Bug del frontend. |

> No esperar `422` — el backend silencia errores de validación de negocio en este endpoint por seguridad.

---

### 🟡 `POST /auth/change-password`

> Cambia la contraseña del usuario autenticado. El backend revoca **todos** los refresh tokens del usuario en Firebase (user-wide), cerrando sesiones en otros dispositivos.

**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`, `X-Platform` (`ios` | `android`), `X-App-Version` (opcional)

**Enviar:**

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Esperar:** `204 No Content` (sin body).

**Acción en frontend:**

1. Mostrar confirmación de cambio exitoso.
2. **Cerrar sesión local**: limpiar ambos tokens de Keychain/Keystore + Zustand.
3. Navegar al login para que el usuario se re-autentique con la nueva contraseña.

> **¿Por qué re-autenticar?** El backend revoca todos los refresh tokens de Firebase (user-wide) al cambiar contraseña. El refresh del dispositivo actual también queda inválido — cualquier intento de refresh posterior fallaría con `401`. Re-autenticar es la forma limpia de obtener tokens frescos.

**Errores:**

| Código | Qué hacer                                                                |
| :----- | :----------------------------------------------------------------------- |
| `400`  | Body malformado. Bug del frontend.                                       |
| `401`  | Token expirado. El interceptor debería manejar el refresh automático.    |
| `422`  | Validación fallida. Mapear `fields[]` a errores por campo en formulario. |

---

### 🟢 `GET /auth/profile`

**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`, `X-Platform` (`ios` | `android`), `X-App-Version` (opcional)

**Esperar `200`:**

```json
{
  "id": "uuid",
  "email": "string",
  "firstName": "string | null",
  "lastName": "string | null",
  "avatarUrl": "string | null",
  "subscriptionPlan": "string",
  "countryCode": "string",
  "latitude": "number | null",
  "longitude": "number | null"
}
```

**Acción en frontend:** Actualizar `user` en Zustand.

**Errores:**

| Código | Qué hacer                                                             |
| :----- | :-------------------------------------------------------------------- |
| `401`  | Token expirado. El interceptor debería manejar el refresh automático. |
| `404`  | Usuario no encontrado. Limpiar sesión → login.                        |

---

### 🟠 `PATCH /auth/profile`

**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`, `X-Platform` (`ios` | `android`), `X-App-Version` (opcional)

**Enviar:** Solo los campos que cambian.

```json
{
  "firstName": "string | null",
  "lastName": "string | null",
  "avatarUrl": "string | null",
  "countryCode": "string | null",
  "latitude": "number | null",
  "longitude": "number | null"
}
```

**Esperar `200`:** Objeto `user` actualizado (mismo shape que GET profile).

**Acción en frontend:** Reemplazar `user` en Zustand con la respuesta.

**Errores:**

| Código | Qué hacer                                                                |
| :----- | :----------------------------------------------------------------------- |
| `400`  | Body malformado. Bug del frontend.                                       |
| `401`  | Token expirado. El interceptor debería manejar el refresh automático.    |
| `422`  | Validación fallida. Mapear `fields[]` a errores por campo en formulario. |

---

### 🟡 `POST /auth/logout`

**Headers:** `Authorization`, `X-Device-Id`, `X-Device-Name`, `X-Platform` (`ios` | `android`), `X-App-Version` (opcional)

**Enviar:** Body vacío.

**Esperar:** `204 No Content` (sin body).

**Acción en frontend:**

1. Borrar `refreshToken` de Keychain/Keystore.
2. Borrar `accessToken` de Keychain/Keystore.
3. Limpiar `user` y tokens de Zustand.
4. Navegar a login (o Dashboard como guest).

> **Importante:** El cliente **debe** borrar los tokens de Keychain/Keystore al recibir `204`. Si no lo hace, el `refreshToken` sigue siendo válido contra Firebase hasta que expire o el usuario cambie contraseña.

**Errores:**

| Código | Qué hacer                                                             |
| :----- | :-------------------------------------------------------------------- |
| `401`  | Token expirado. El interceptor debería manejar el refresh automático. |
| `404`  | Dispositivo no registrado. Limpiar sesión igualmente.                 |
