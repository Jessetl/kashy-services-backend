# 🔄 Flujo de Autenticación — `/auth`

> Cómo funciona la auth de Kashy de punta a punta. Basado en [`router/authentication.md`](../router/authentication.md).
> **Principio:** El frontend nunca habla con Firebase directo — todo pasa por el backend.

---

## Componentes

| Componente | Rol |
| ---------- | --- |
| **Frontend (React Native)** | Captura credenciales, guarda tokens, dispara refresh, navega. |
| **Backend Kashy** | Único intermediario. Valida credenciales contra Firebase, emite `accessToken` (JWT custom). |
| **Firebase** | Fuente de verdad de auth. Valida credenciales, emite/rota `refreshToken`. |
| **Keychain / Keystore** | Almacén cifrado persistente. Fuente de verdad de tokens en el device. |
| **Zustand** | Estado en memoria. Copia de trabajo rápida de tokens + `user`. |

### Dos tokens, dos vidas

| Token | Emisor | Vida | Uso |
| ----- | ------ | ---- | --- |
| `accessToken` | Backend (JWT custom) | 15 min (`expiresIn: 900`) | `Authorization: Bearer {jwt}` en rutas protegidas. |
| `refreshToken` | Firebase | Larga, rotable | Canjear por nuevo `accessToken` vía `/auth/refresh`. El crítico. |

---

## Regla de escritura de tokens

> Orden **obligatorio** al recibir tokens del backend:

1. **Sobrescribir** Keychain/Keystore (fuente de verdad persistente).
2. Luego actualizar Zustand (memoria).

Nunca al revés. Keychain primero, memoria después.

---

## Flujo 1 — Registro

> `POST /auth/register` **no** abre sesión. Requiere verificación de email.

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend
    participant FB as Firebase

    FE->>BE: POST /auth/register (email, password, firstName...)
    BE->>FB: Crear usuario
    FB-->>BE: ok + envía email verificación
    BE-->>FE: 201 { message, email }
    Note over FE: NO guardar token. NO abrir sesión.
    FE->>FE: Mostrar "Revisa tu correo" → navegar a Login
```

**Errores:** `409` email duplicado · `422` validación (mapear `fields[]`).

---

## Flujo 2 — Login (email/password y Google)

> Misma salida para `/auth/login` y `/auth/login/google`: tokens + `user`.

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend
    participant FB as Firebase
    participant KC as Keychain/Keystore
    participant ZS as Zustand

    Note over FE: Headers obligatorios:<br/>X-Device-Id, X-Device-Name, X-Platform
    FE->>BE: POST /auth/login (email, password)
    BE->>FB: Validar credenciales
    FB-->>BE: ok + refreshToken
    BE->>BE: Emitir accessToken (JWT custom, 15 min)
    BE-->>FE: 200 { accessToken, refreshToken, expiresIn, user }
    FE->>KC: 1. Guardar refreshToken + accessToken
    FE->>ZS: 2. Cargar tokens + user en memoria
    FE->>FE: Navegar a Dashboard (replace)
```

**Variante Google:** FE obtiene `googleIdToken` con Google Sign-In SDK → lo envía en body. Auto-registro asigna `countryCode = 'VE'` por defecto.

**Errores:** `401` credenciales inválidas o **email no verificado**.

---

## Flujo 3 — Request protegido + refresh automático

> Corazón del sistema. El `accessToken` vive 15 min; al expirar, el interceptor lo renueva sin que el usuario lo note.

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant INT as Interceptor
    participant BE as Backend
    participant FB as Firebase
    participant KC as Keychain/Keystore

    FE->>BE: GET /auth/profile (Bearer accessToken expirado)
    BE-->>INT: 401 Token expirado
    INT->>KC: Leer refreshToken
    INT->>BE: POST /auth/refresh (refreshToken en body + headers device)
    BE->>FB: Canjear refreshToken
    FB-->>BE: nuevo accessToken + refreshToken (rotado o mismo)
    BE-->>INT: 200 { accessToken, refreshToken, expiresIn }
    INT->>KC: SOBRESCRIBIR ambos tokens (siempre)
    INT->>BE: Reintentar request original
    BE-->>FE: 200 (respuesta real)
```

**Claves:**

- `/auth/refresh` es **pública** (sin `Authorization`). El `refreshToken` del body es el credencial; Firebase lo valida cripto.
- `X-Device-Id` debe coincidir con `user_devices` (device binding).
- **Rotación silenciosa:** Firebase puede rotar el refresh. Siempre sobrescribir, aunque parezca igual. Usar el viejo tras rotación = `401`.

**Falla de refresh (`401`):** refresh revocado/expirado o device mismatch → **borrar ambos tokens + limpiar Zustand → login. No reintentar.**

---

## Flujo 4 — Cambio de contraseña

> Revoca **todos** los refresh tokens del usuario en Firebase (user-wide). Cierra sesión en todos los devices.

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend
    participant FB as Firebase

    FE->>BE: POST /auth/change-password (currentPassword, newPassword) [Auth]
    BE->>FB: Cambiar password + revocar TODOS los refresh tokens (user-wide)
    FB-->>BE: ok
    BE-->>FE: 204 No Content
    Note over FE: El refresh del device actual quedó inválido también.
    FE->>FE: Limpiar tokens (KC + Zustand) → Login
```

**Por qué re-autenticar:** el refresh local también murió. Cualquier refresh posterior daría `401`. Re-login = forma limpia de obtener tokens frescos.

---

## Flujo 5 — Logout

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend
    participant FB as Firebase
    participant KC as Keychain/Keystore

    FE->>BE: POST /auth/logout (body vacío) [Auth + headers device]
    BE->>FB: Revocar refreshToken de este device
    BE-->>FE: 204 No Content
    FE->>KC: Borrar refreshToken + accessToken
    FE->>FE: Limpiar Zustand → Login (o Dashboard guest)
```

**Crítico:** El cliente **debe** borrar tokens al recibir `204`. Si no, el `refreshToken` sigue válido contra Firebase hasta expirar o cambio de password.

---

## Flujo 6 — Recuperar contraseña

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend

    FE->>BE: POST /auth/recover-password (email)
    BE-->>FE: 204 (SIEMPRE, exista o no el email)
    Note over BE: Anti-enumeración de usuarios.
    FE->>FE: Mostrar "Revisa tu correo" → Login
```

No esperar `422` — el backend silencia errores de validación por seguridad.

---

## Manejo global de `401`

```mermaid
flowchart TD
    A[Request protegido] --> B{Respuesta}
    B -->|200| C[ok]
    B -->|401| D{Tipo de 401}
    D -->|accessToken expirado| E[Interceptor: POST /auth/refresh]
    E -->|200| F[Sobrescribir tokens → reintentar request]
    E -->|401| G[Refresh inválido]
    D -->|refresh revocado/device fail| G
    G --> H[Borrar tokens KC + Zustand → Login. NO reintentar]
```

---

## Reglas de almacenamiento (resumen)

- ✅ `refreshToken` + `accessToken` → **Keychain / Keystore** cifrado.
- ✅ `user` + tokens en memoria → **Zustand** (rehidratado desde Keychain o `GET /auth/profile`).
- ✅ Preferencias UI no sensibles → **AsyncStorage**.
- ❌ **Nunca** tokens en `AsyncStorage`, `SharedPreferences` plain, `NSUserDefaults` o archivos sin cifrar.
- ❌ **No** sincronizar `refreshToken` a iCloud Keychain ni Google Backup (refresh es per-device).

---

## Matriz de endpoints

| Método | Ruta | Auth | Abre sesión | Headers device |
| ------ | ---- | :--: | :---------: | :------------: |
| `POST` | `/auth/register` | ❌ | ❌ | ❌ |
| `POST` | `/auth/login` | ❌ | ✅ | ✅ |
| `POST` | `/auth/login/google` | ❌ | ✅ | ✅ |
| `POST` | `/auth/refresh` | ❌ | renueva | ✅ |
| `POST` | `/auth/recover-password` | ❌ | ❌ | ❌ |
| `POST` | `/auth/change-password` | ✅ | cierra todas | ✅ |
| `GET`  | `/auth/profile` | ✅ | — | ✅ |
| `PATCH`| `/auth/profile` | ✅ | — | ✅ |
| `POST` | `/auth/logout` | ✅ | cierra una | ✅ |

> Todas las rutas con prefijo `/api/v1`. `X-Platform`: `ios` | `android`. `X-App-Version` opcional.
