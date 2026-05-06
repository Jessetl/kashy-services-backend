# 🔌 Servicios Externos — Kashy

> Catálogo de todos los servicios de terceros que consume el backend de Kashy.
> Cualquier IA o desarrollador debe consultar este archivo antes de integrar o modificar conexiones externas.

---

## Resumen de Servicios

| Servicio                     | Propósito                                                                            | Auth                                       | Entorno     |
| :--------------------------- | :----------------------------------------------------------------------------------- | :----------------------------------------- | :---------- |
| **Firebase Authentication**  | Login, registro, verificación de tokens, refresh tokens, recuperación de contraseña. | Service Account (Admin SDK) + REST API Key | Cloud       |
| **Firebase Cloud Messaging** | Envío de notificaciones push a iOS y Android.                                        | Service Account (Admin SDK)                | Cloud       |
| **RabbitMQ**                 | Cola de mensajería para procesamiento asíncrono de notificaciones.                   | Connection string (user/password)          | Self-hosted |
| **DolarAPI**                 | Tasa de cambio oficial y paralelo del dólar en Venezuela.                            | ❌ Pública (sin auth)                      | Cloud       |

---

## 🔐 Firebase Authentication

> Proveedor de identidad. El backend maneja toda la interacción con Firebase — el frontend nunca se comunica directamente.

### Uso en Kashy

| Operación             | Método    | Detalle                                                                                                                                                         |
| :-------------------- | :-------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registro              | REST API  | `signUp` — crea usuario y devuelve `idToken` + `refreshToken`. El `refreshToken` se almacena encriptado en `user_devices`, nunca se envía al frontend.          |
| Login email/password  | REST API  | `signInWithPassword` — autentica y devuelve `idToken` + `refreshToken`. El `refreshToken` se almacena encriptado en `user_devices`, nunca se envía al frontend. |
| Login Google          | Admin SDK | `verifyIdToken()` — verifica el `google_id_token` del frontend. Se obtiene `refreshToken` vía token exchange y se almacena encriptado en `user_devices`.        |
| Verificación de token | Admin SDK | `verifyIdToken()` — valida el `idToken` en cada request (internamente, para generar JWT custom).                                                                |
| Refresh token         | REST API  | `token` endpoint — el backend usa el `refreshToken` almacenado en BD para obtener un nuevo `idToken`. El frontend nunca participa en este proceso.              |
| Recuperar contraseña  | REST API  | `sendOobCode` — envía email de recuperación.                                                                                                                    |
| Cambiar contraseña    | Admin SDK | `updateUser()` — actualiza contraseña. Revoca todos los `refreshToken` en BD excepto el dispositivo actual.                                                     |
| Revocar sesiones      | Admin SDK | `revokeRefreshTokens()` — revoca todos los refresh tokens de un usuario. Se eliminan los `refreshToken` de `user_devices`.                                      |

### Endpoints de Firebase REST API

| Acción               | URL                                                                                   | Método |
| :------------------- | :------------------------------------------------------------------------------------ | :----- |
| Registro             | `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}`             | `POST` |
| Login                | `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}` | `POST` |
| Refresh token        | `https://securetoken.googleapis.com/v1/token?key={API_KEY}`                           | `POST` |
| Recuperar contraseña | `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={API_KEY}`        | `POST` |

### Variables de entorno

| Variable                   | Descripción                                       |
| :------------------------- | :------------------------------------------------ |
| `FIREBASE_API_KEY`         | API Key del proyecto Firebase (para REST API).    |
| `FIREBASE_SERVICE_ACCOUNT` | Path o JSON del Service Account (para Admin SDK). |
| `FIREBASE_PROJECT_ID`      | ID del proyecto Firebase.                         |

---

## 📲 Firebase Cloud Messaging (FCM)

> Servicio de notificaciones push para iOS y Android.

### Uso en Kashy

| Operación             | Método    | Detalle                                                                         |
| :-------------------- | :-------- | :------------------------------------------------------------------------------ |
| Envío push individual | Admin SDK | `messaging().send()` — envía notificación a un device token FCM específico.     |
| Envío push masivo     | Admin SDK | `messaging().sendEachForMulticast()` — envía a múltiples devices de un usuario. |

### Flujo de notificaciones

```
Cron/Scheduler → Detecta notificaciones PENDING con scheduled_at <= hoy
    → Publica mensaje en RabbitMQ
        → Consumer procesa el mensaje
            → Busca FCM tokens del usuario en user_devices
                → Envía push vía FCM Admin SDK
                    → Actualiza notification: status = SENT, sent_at = now
                    → Si falla: status = FAILED
```

### Variables de entorno

| Variable                   | Descripción                                        |
| :------------------------- | :------------------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT` | Mismo Service Account que Auth (FCM usa el mismo). |

---

## 🐇 RabbitMQ

> Cola de mensajería para desacoplar el procesamiento de notificaciones del flujo principal de la API.

### Uso en Kashy

| Queue                | Producer       | Consumer            | Detalle                                          |
| :------------------- | :------------- | :------------------ | :----------------------------------------------- |
| `notifications.send` | Cron/Scheduler | Notification Worker | Procesa envío de notificaciones push pendientes. |

### Flujo

1. El cron job consulta `notifications` con `status = PENDING` y `scheduled_at <= hoy`.
2. Publica un mensaje por cada notificación en la queue `notifications.send`.
3. El consumer recibe el mensaje, busca los FCM tokens del usuario en `user_devices`.
4. Envía la push notification vía FCM.
5. Actualiza el status de la notificación en BD (`SENT` o `FAILED`).

### Formato del mensaje

```json
{
  "notification_id": "uuid",
  "user_id": "uuid",
  "title": "string",
  "body": "string",
  "data": {
    "financial_record_id": "uuid",
    "type": "EXPENSE"
  }
}
```

### Variables de entorno

| Variable                       | Descripción                                                    |
| :----------------------------- | :------------------------------------------------------------- |
| `RABBITMQ_URL`                 | Connection string (ej: `amqp://user:password@localhost:5672`). |
| `RABBITMQ_QUEUE_NOTIFICATIONS` | Nombre de la queue (default: `notifications.send`).            |

---

## 💱 DolarAPI

> API pública y gratuita para obtener la tasa de cambio del dólar en Venezuela. Proyecto open source.

### Base URL

```
https://ve.dolarapi.com
```

### Endpoints utilizados por Kashy

| Método | Ruta                   | Descripción                   | Response                                                                      |
| :----- | :--------------------- | :---------------------------- | :---------------------------------------------------------------------------- |
| `GET`  | `/v1/dolares/oficial`  | Tasa oficial del dólar (BCV). | `{ "fuente", "nombre", "compra", "venta", "promedio", "fechaActualizacion" }` |
| `GET`  | `/v1/dolares/paralelo` | Tasa paralelo del dólar.      | Mismo shape que oficial.                                                      |

### Response de ejemplo

```json
{
  "fuente": "BCV",
  "nombre": "Oficial",
  "compra": null,
  "venta": 96.63,
  "promedio": 96.63,
  "fechaActualizacion": "2026-05-05T00:00:00.000Z"
}
```

### Uso en Kashy

- El endpoint público `GET /api/v1/exchange-rate/current` de Kashy consume DolarAPI internamente y devuelve la tasa formateada al frontend.
- Se usa para calcular `exchange_rate_snapshot` al crear listas de compras.
- Se usa para las conversiones `amount_local` ↔ `amount_usd` en registros financieros.

### Consideraciones

| Aspecto            | Detalle                                                                                |
| :----------------- | :------------------------------------------------------------------------------------- |
| **Auth**           | No requiere. API pública sin API key.                                                  |
| **Rate limit**     | No documentado oficialmente. Implementar cache en backend (recomendado: 5-15 min TTL). |
| **Disponibilidad** | Proyecto open source. Considerar fallback si el servicio cae.                          |
| **Licencia**       | MIT.                                                                                   |
| **Documentación**  | [https://dolarapi.com/docs/venezuela/](https://dolarapi.com/docs/venezuela/)           |

### Variables de entorno

| Variable             | Descripción                                                |
| :------------------- | :--------------------------------------------------------- |
| `DOLARAPI_BASE_URL`  | Base URL de DolarAPI (default: `https://ve.dolarapi.com`). |
| `DOLARAPI_CACHE_TTL` | Tiempo de cache en segundos (default: `600` — 10 min).     |

---

## 🔑 Resumen de Variables de Entorno

| Variable                       | Servicio                        |     Requerida      |
| :----------------------------- | :------------------------------ | :----------------: |
| `FIREBASE_API_KEY`             | Firebase Auth (REST API)        |         ✅         |
| `FIREBASE_SERVICE_ACCOUNT`     | Firebase Auth + FCM (Admin SDK) |         ✅         |
| `FIREBASE_PROJECT_ID`          | Firebase                        |         ✅         |
| `RABBITMQ_URL`                 | RabbitMQ                        |         ✅         |
| `RABBITMQ_QUEUE_NOTIFICATIONS` | RabbitMQ                        | ❌ (tiene default) |
| `DOLARAPI_BASE_URL`            | DolarAPI                        | ❌ (tiene default) |
| `DOLARAPI_CACHE_TTL`           | DolarAPI                        | ❌ (tiene default) |
