# KASHY DATABASE SPEC

**RESUMEN**: Esquema de base de datos PostgreSQL para el MVP de Kashy.
**META**: Documentar todas las tablas, relaciones y tipos para que cualquier IA o desarrollador tenga contexto completo antes de escribir queries, migraciones o endpoints.

## 🗄 MÓDULO: USUARIOS

### `users`

> Gestiona la identidad, permisos, parametrización financiera y ubicación de cada cuenta.

| Campo               | Tipo      | Constraints      | Descripción                     |
| :------------------ | :-------- | :--------------- | :------------------------------ |
| `id`                | UUID      | PK               | Identificador único.            |
| `firebase_uid`      | String    | Unique, Not Null | UID de Firebase Authentication. |
| `email`             | String    | Unique, Not Null | Correo electrónico del usuario. |
| `first_name`        | String    | Nullable         | Nombre.                         |
| `last_name`         | String    | Nullable         | Apellido.                       |
| `avatar_url`        | String    | Nullable         | URL de imagen de perfil.        |
| `subscription_plan` | Enum      | Not Null         | Plan de suscripción.            |
| `country_code`      | String    | Not Null         | Código de país (ej: VE).        |
| `latitude`          | Decimal   | Nullable         | Latitud de ubicación.           |
| `longitude`         | Decimal   | Nullable         | Longitud de ubicación.          |
| `created_at`        | Timestamp | Not Null         | Fecha de creación.              |
| `updated_at`        | Timestamp | Not Null         | Última actualización.           |

### `user_devices`

> Dispositivos registrados para notificaciones push y gestión de sesiones. Almacena el refresh token de Firebase encriptado para renovación transparente de JWT.

| Campo                    | Tipo      | Constraints         | Descripción                                                                                  |
| :----------------------- | :-------- | :------------------ | :------------------------------------------------------------------------------------------- |
| `id`                     | UUID      | PK                  | Identificador único.                                                                         |
| `user_id`                | UUID      | FK → users          | Usuario dueño del dispositivo.                                                               |
| `device_id`              | String    | Unique, Not Null    | `X-Device-Id` del dispositivo.                                                               |
| `device_name`            | String    | Not Null            | `X-Device-Name` (formato: `[OS] [VERSION] [MARCA] [MODEL]`).                                 |
| `firebase_fcm_token`     | String    | Unique, Not Null    | Token FCM para notificaciones push.                                                          |
| `firebase_refresh_token` | String    | Not Null, Encrypted | Refresh token de Firebase. Encriptado en reposo. Usado por el backend para renovar sesiones. |
| `platform`               | String    | Not Null            | `ios` / `android`.                                                                           |
| `app_version`            | String    | Nullable            | Versión de la app instalada.                                                                 |
| `last_active_at`         | Timestamp | Not Null            | Última actividad del dispositivo.                                                            |
| `created_at`             | Timestamp | Not Null            | Fecha de registro del dispositivo.                                                           |

## 🛒 MÓDULO: COMPRAS

### `shopping_lists`

> Listas de compras con soporte para plantillas, recibos, multi-moneda e IVA.

| Campo                    | Tipo      | Constraints | Descripción                         |
| :----------------------- | :-------- | :---------- | :---------------------------------- |
| `id`                     | UUID      | PK          | Identificador único.                |
| `user_id`                | UUID      | FK → users  | Usuario dueño de la lista.          |
| `name`                   | String    | Not Null    | Nombre de la lista.                 |
| `store_name`             | String    | Nullable    | Tienda asociada.                    |
| `list_type`              | Enum      | Not Null    | `TEMPLATE` / `RECEIPT`.             |
| `country_code`           | String    | Not Null    | Código de país.                     |
| `currency_code`          | String    | Not Null    | Código de moneda (ej: VES, USD).    |
| `exchange_rate_snapshot` | Decimal   | Not Null    | Tasa de cambio al momento de crear. |
| `iva_enabled`            | Boolean   | Not Null    | Si aplica IVA a los items.          |
| `scheduled_date`         | Timestamp | Nullable    | Fecha programada de compra.         |
| `latitude`               | Decimal   | Nullable    | Latitud de la tienda.               |
| `longitude`              | Decimal   | Nullable    | Longitud de la tienda.              |
| `is_active`              | Boolean   | Not Null    | Si la lista está activa.            |

### `shopping_items`

> Productos individuales dentro de una lista de compras.

| Campo              | Tipo    | Constraints         | Descripción                      |
| :----------------- | :------ | :------------------ | :------------------------------- |
| `id`               | UUID    | PK                  | Identificador único.             |
| `list_id`          | UUID    | FK → shopping_lists | Lista a la que pertenece.        |
| `product_name`     | String  | Not Null            | Nombre del producto.             |
| `category`         | String  | Not Null            | Categoría del producto.          |
| `quantity`         | Integer | Not Null            | Cantidad.                        |
| `unit_price_local` | Decimal | Nullable            | Precio unitario en moneda local. |
| `unit_price_usd`   | Decimal | Nullable            | Precio unitario en USD.          |
| `is_checked`       | Boolean | Not Null            | Si fue marcado como comprado.    |

## 💰 MÓDULO: FINANZAS

### `financial_records`

> Registros de ingresos y egresos con soporte para recurrencia y prioridad.

| Campo            | Tipo    | Constraints | Descripción                          |
| :--------------- | :------ | :---------- | :----------------------------------- |
| `id`             | UUID    | PK          | Identificador único.                 |
| `user_id`        | UUID    | FK → users  | Usuario dueño del registro.          |
| `type`           | Enum    | Not Null    | `INCOME` / `EXPENSE`.                |
| `title`          | String  | Not Null    | Título del registro.                 |
| `description`    | String  | Nullable    | Descripción adicional.               |
| `amount_local`   | Decimal | Not Null    | Monto en moneda local.               |
| `amount_usd`     | Decimal | Not Null    | Monto en USD.                        |
| `priority`       | Enum    | Nullable    | `HIGH` / `MEDIUM` / `LOW`.           |
| `interest_rate`  | Decimal | Nullable    | Tasa de interés (si aplica).         |
| `date`           | Date    | Not Null    | Fecha del registro.                  |
| `is_recurring`   | Boolean | Not Null    | Si es recurrente.                    |
| `recurrence_day` | Integer | Nullable    | Día del mes (1-31) si es recurrente. |

### `financial_goals` _(Premium — Post-MVP)_

> Metas financieras con seguimiento de progreso.

| Campo               | Tipo    | Constraints | Descripción                 |
| :------------------ | :------ | :---------- | :-------------------------- |
| `id`                | UUID    | PK          | Identificador único.        |
| `user_id`           | UUID    | FK → users  | Usuario dueño de la meta.   |
| `title`             | String  | Not Null    | Título de la meta.          |
| `target_amount_usd` | Decimal | Not Null    | Monto objetivo en USD.      |
| `deadline_date`     | Date    | Not Null    | Fecha límite.               |
| `status`            | Enum    | Not Null    | `IN_PROGRESS` / `ACHIEVED`. |

## 🔔 MÓDULO: NOTIFICACIONES

### `notifications`

> Registro de recordatorios programados y su estado de envío.

| Campo          | Tipo    | Constraints             | Descripción                         |
| :------------- | :------ | :---------------------- | :---------------------------------- |
| `id`           | UUID    | PK                      | Identificador único.                |
| `user_id`      | UUID    | FK → users              | Usuario destinatario.               |
| `financial_id` | UUID    | FK → financial_records  | Registro financiero asociado.       |
| `type`         | String  | Not Null                | Tipo de notificación.               |
| `scheduled_at` | Date    | Not Null                | Fecha programada de envío.          |
| `sent_at`      | Date    | Nullable                | Fecha real de envío.                |
| `status`       | Enum    | Not Null                | `PENDING` / `SENT` / `FAILED`.      |
| `is_read`      | Boolean | Not Null, Default false | Si el usuario leyó la notificación. |

### `notification_preferences`

> Preferencias de notificación por usuario.

| Campo            | Tipo      | Constraints        | Descripción                        |
| :--------------- | :-------- | :----------------- | :--------------------------------- |
| `id`             | UUID      | PK                 | Identificador único.               |
| `user_id`        | UUID      | FK → users, Unique | Usuario dueño de las preferencias. |
| `push_enabled`   | Boolean   | Not Null           | Notificaciones push activadas.     |
| `debt_reminders` | Boolean   | Not Null           | Recordatorios de deudas.           |
| `price_alerts`   | Boolean   | Not Null           | Alertas de precios.                |
| `list_reminders` | Boolean   | Not Null           | Recordatorios de listas.           |
| `updated_at`     | Timestamp | Not Null           | Última actualización.              |

## 🔗 RELACIONES

| Origen              |  →  | Destino                    | Tipo | Descripción                                    |
| :------------------ | :-: | :------------------------- | :--- | :--------------------------------------------- |
| `users`             |  →  | `user_devices`             | 1:N  | Un usuario tiene muchos dispositivos.          |
| `users`             |  →  | `shopping_lists`           | 1:N  | Un usuario tiene muchas listas.                |
| `users`             |  →  | `financial_records`        | 1:N  | Un usuario tiene muchos registros.             |
| `users`             |  →  | `financial_goals`          | 1:N  | Un usuario tiene muchas metas.                 |
| `users`             |  →  | `notifications`            | 1:N  | Un usuario tiene muchas notificaciones.        |
| `users`             |  →  | `notification_preferences` | 1:1  | Un usuario tiene una config de notificaciones. |
| `shopping_lists`    |  →  | `shopping_items`           | 1:N  | Una lista tiene muchos items.                  |
| `financial_records` |  →  | `notifications`            | 1:N  | Un registro puede tener muchos recordatorios.  |
