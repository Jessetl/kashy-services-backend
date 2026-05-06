# 🏗 Architecture — Kashy Backend

> Manual de referencia técnica. Define la estructura de carpetas, convenciones de nombrado y reglas arquitectónicas.
> Cualquier IA o desarrollador debe consultar este archivo antes de crear archivos, carpetas o módulos.

---

## Principios Arquitectónicos

| Principio                         | Detalle                                                                                                         |
| :-------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **Patrón**                        | Clean Architecture + Monolito Modular.                                                                          |
| **Preparado para microservicios** | Cada dominio es autocontenido con sus 3 capas. Para extraer un micro, se copia la carpeta completa del dominio. |
| **Dependencia hacia adentro**     | `Infrastructure → Application → Domain`. El dominio nunca depende de capas externas.                            |
| **Shared Kernel**                 | Código transversal compartido entre dominios (guards, interceptors, filtros, decoradores, DTOs base, etc.).     |
| **Inyección de dependencias**     | Vía módulos de NestJS. Los puertos (interfaces) viven en el dominio, las implementaciones en infrastructure.    |

---

## Capas por Dominio

```
domain/          → Entidades, value objects, enums, interfaces de repositorio (puertos).
                   NO depende de nada externo. Puro TypeScript, sin decoradores de NestJS.

application/     → Casos de uso (services), DTOs de entrada/salida, interfaces de servicios externos.
                   Depende solo de domain/. Orquesta la lógica de negocio.

infrastructure/  → Controladores, implementación de repositorios (TypeORM), adaptadores externos.
                   Depende de domain/ y application/. Es la capa que habla con el mundo exterior.
```

---

## Estructura de Carpetas

```
src/
├── app.module.ts
├── main.ts
│
├── shared-kernel/
│   ├── shared-kernel.module.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── public.decorator.ts
│   ├── dtos/
│   │   ├── paginated-request.dto.ts
│   │   ├── paginated-response.dto.ts
│   │   └── error-response.dto.ts
│   ├── enums/
│   │   └── sort-order.enum.ts
│   ├── exceptions/
│   │   ├── business.exception.ts
│   │   └── not-found.exception.ts
│   ├── filters/
│   │   └── global-exception.filter.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── device-headers.guard.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform-response.interceptor.ts
│   ├── interfaces/
│   │   └── request-context.interface.ts
│   ├── pipes/
│   │   └── uuid-validation.pipe.ts
│   └── utils/
│       ├── crypto.util.ts
│       └── date.util.ts
│
├── auth/
│   ├── auth.module.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   └── user-device.entity.ts
│   │   ├── enums/
│   │   │   └── subscription-plan.enum.ts
│   │   ├── interfaces/
│   │   │   ├── user.repository.interface.ts
│   │   │   ├── user-device.repository.interface.ts
│   │   │   └── firebase-auth.service.interface.ts
│   │   └── value-objects/
│   │       └── device-info.value-object.ts
│   ├── application/
│   │   ├── services/
│   │   │   └── auth.service.ts
│   │   └── dtos/
│   │       ├── register-request.dto.ts
│   │       ├── login-request.dto.ts
│   │       ├── login-google-request.dto.ts
│   │       ├── change-password-request.dto.ts
│   │       ├── recover-password-request.dto.ts
│   │       ├── update-profile-request.dto.ts
│   │       ├── auth-response.dto.ts
│   │       └── profile-response.dto.ts
│   └── infrastructure/
│       ├── controllers/
│       │   └── auth.controller.ts
│       ├── repositories/
│       │   ├── user.repository.ts
│       │   └── user-device.repository.ts
│       └── adapters/
│           └── firebase-auth.adapter.ts
│
├── finances/
│   ├── finances.module.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   └── financial-record.entity.ts
│   │   ├── enums/
│   │   │   ├── financial-type.enum.ts
│   │   │   └── priority.enum.ts
│   │   └── interfaces/
│   │       └── financial-record.repository.interface.ts
│   ├── application/
│   │   ├── services/
│   │   │   └── finances.service.ts
│   │   └── dtos/
│   │       ├── create-financial-record-request.dto.ts
│   │       ├── update-financial-record-request.dto.ts
│   │       ├── search-financial-records-request.dto.ts
│   │       ├── financial-record-response.dto.ts
│   │       └── financial-summary-response.dto.ts
│   └── infrastructure/
│       ├── controllers/
│       │   └── finances.controller.ts
│       ├── repositories/
│       │   └── financial-record.repository.ts
│       └── schedulers/
│           └── recurrence.scheduler.ts
│
├── shopping/
│   ├── shopping.module.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── shopping-list.entity.ts
│   │   │   └── shopping-item.entity.ts
│   │   ├── enums/
│   │   │   └── list-type.enum.ts
│   │   └── interfaces/
│   │       ├── shopping-list.repository.interface.ts
│   │       └── shopping-item.repository.interface.ts
│   ├── application/
│   │   ├── services/
│   │   │   ├── shopping-list.service.ts
│   │   │   └── shopping-compare.service.ts
│   │   └── dtos/
│   │       ├── create-shopping-list-request.dto.ts
│   │       ├── update-shopping-list-request.dto.ts
│   │       ├── search-shopping-lists-request.dto.ts
│   │       ├── compare-lists-request.dto.ts
│   │       ├── shopping-list-response.dto.ts
│   │       ├── shopping-list-summary-response.dto.ts
│   │       └── compare-lists-response.dto.ts
│   └── infrastructure/
│       ├── controllers/
│       │   └── shopping.controller.ts
│       └── repositories/
│           ├── shopping-list.repository.ts
│           └── shopping-item.repository.ts
│
├── notifications/
│   ├── notifications.module.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── notification.entity.ts
│   │   │   └── notification-preference.entity.ts
│   │   ├── enums/
│   │   │   └── notification-status.enum.ts
│   │   └── interfaces/
│   │       ├── notification.repository.interface.ts
│   │       ├── notification-preference.repository.interface.ts
│   │       └── push-notification.service.interface.ts
│   ├── application/
│   │   ├── services/
│   │   │   ├── notification.service.ts
│   │   │   └── notification-preference.service.ts
│   │   └── dtos/
│   │       ├── search-notifications-request.dto.ts
│   │       ├── notification-response.dto.ts
│   │       ├── unread-count-response.dto.ts
│   │       └── notification-preference-response.dto.ts
│   └── infrastructure/
│       ├── controllers/
│       │   ├── notification.controller.ts
│       │   └── notification-preference.controller.ts
│       ├── repositories/
│       │   ├── notification.repository.ts
│       │   └── notification-preference.repository.ts
│       ├── adapters/
│       │   └── fcm-push-notification.adapter.ts
│       └── consumers/
│           └── notification-send.consumer.ts
│
├── exchange-rate/
│   ├── exchange-rate.module.ts
│   ├── domain/
│   │   └── interfaces/
│   │       └── exchange-rate.service.interface.ts
│   ├── application/
│   │   ├── services/
│   │   │   └── exchange-rate.service.ts
│   │   └── dtos/
│   │       └── exchange-rate-response.dto.ts
│   └── infrastructure/
│       ├── controllers/
│       │   └── exchange-rate.controller.ts
│       └── adapters/
│           └── dolarapi.adapter.ts
│
└── config/
    ├── database.config.ts
    ├── firebase.config.ts
    ├── rabbitmq.config.ts
    └── app.config.ts
```

---

## Convenciones de Nombrado

### Archivos

| Tipo                           | Patrón                                         | Ejemplo                                  |
| :----------------------------- | :--------------------------------------------- | :--------------------------------------- |
| Entidad                        | `{nombre}.entity.ts`                           | `user.entity.ts`                         |
| Repositorio (interfaz)         | `{nombre}.repository.interface.ts`             | `user.repository.interface.ts`           |
| Repositorio (implementación)   | `{nombre}.repository.ts`                       | `user.repository.ts`                     |
| Servicio de dominio (interfaz) | `{nombre}.service.interface.ts`                | `firebase-auth.service.interface.ts`     |
| Servicio de aplicación         | `{nombre}.service.ts`                          | `auth.service.ts`                        |
| Controlador                    | `{nombre}.controller.ts`                       | `auth.controller.ts`                     |
| Adaptador                      | `{nombre}.adapter.ts`                          | `firebase-auth.adapter.ts`               |
| DTO                            | `{acción}-{nombre}-{request\|response}.dto.ts` | `create-financial-record-request.dto.ts` |
| Enum                           | `{nombre}.enum.ts`                             | `financial-type.enum.ts`                 |
| Value Object                   | `{nombre}.value-object.ts`                     | `device-info.value-object.ts`            |
| Guard                          | `{nombre}.guard.ts`                            | `auth.guard.ts`                          |
| Filter                         | `{nombre}.filter.ts`                           | `global-exception.filter.ts`             |
| Interceptor                    | `{nombre}.interceptor.ts`                      | `logging.interceptor.ts`                 |
| Pipe                           | `{nombre}.pipe.ts`                             | `uuid-validation.pipe.ts`                |
| Decorator                      | `{nombre}.decorator.ts`                        | `current-user.decorator.ts`              |
| Scheduler                      | `{nombre}.scheduler.ts`                        | `recurrence.scheduler.ts`                |
| Consumer                       | `{nombre}.consumer.ts`                         | `notification-send.consumer.ts`          |
| Config                         | `{nombre}.config.ts`                           | `database.config.ts`                     |
| Módulo                         | `{dominio}.module.ts`                          | `auth.module.ts`                         |
| Util                           | `{nombre}.util.ts`                             | `crypto.util.ts`                         |

### Formato general

| Regla                   | Detalle                                                                         |
| :---------------------- | :------------------------------------------------------------------------------ |
| **Archivos**            | `kebab-case` con sufijo de tipo.                                                |
| **Clases**              | `PascalCase` con sufijo. Ej: `AuthService`, `UserRepository`, `AuthController`. |
| **Interfaces**          | Prefijo `I`. Ej: `IUserRepository`, `IFirebaseAuthService`.                     |
| **Enums**               | `PascalCase`. Valores en `UPPER_SNAKE_CASE`. Ej: `FinancialType.INCOME`.        |
| **Variables/funciones** | `camelCase`.                                                                    |
| **Constantes**          | `UPPER_SNAKE_CASE`.                                                             |
| **Carpetas**            | `kebab-case`.                                                                   |

---

## Reglas de Dependencia

### ✅ Permitido

```
infrastructure/ → application/ → domain/
infrastructure/ → shared-kernel/
application/    → shared-kernel/ (solo DTOs base, enums, interfaces)
```

### ❌ Prohibido

```
domain/         → application/
domain/         → infrastructure/
domain/         → shared-kernel/ (excepto enums y value objects compartidos)
application/    → infrastructure/
auth/           → finances/ (dominios no se importan entre sí directamente)
```

### Comunicación entre dominios

Si un dominio necesita datos de otro (ej: `finances` necesita crear una `notification`), se comunica a través de:

1. **Eventos internos** (NestJS EventEmitter) — preferido para el monolito.
2. **Interfaces compartidas** en `shared-kernel` — para contratos entre dominios.
3. **Mensajería** (RabbitMQ) — cuando se extraiga a microservicios.

```
finances.service.ts                  notifications.service.ts
        |                                      |
        |-- emit('financial.created') -------->|
        |                                      |-- crear notificación
```

> Esta regla es clave para la extracción a microservicios: si los dominios nunca se importan directamente, separar es copiar la carpeta y cambiar EventEmitter por RabbitMQ.

---

## Módulos de NestJS

Cada dominio tiene un `{dominio}.module.ts` que:

1. Registra sus controladores en `controllers`.
2. Registra sus servicios de aplicación en `providers`.
3. Registra sus repositorios e implementaciones de interfaces en `providers` con `useClass`.
4. Exporta los servicios que otros módulos puedan necesitar (vía eventos, no import directo).

```typescript
// Ejemplo: auth.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserDeviceEntity])],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: 'IUserRepository', useClass: UserRepository },
    { provide: 'IUserDeviceRepository', useClass: UserDeviceRepository },
    { provide: 'IFirebaseAuthService', useClass: FirebaseAuthAdapter },
  ],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## Preparación para Microservicios

| Aspecto           | Monolito actual            | Microservicio futuro                       |
| :---------------- | :------------------------- | :----------------------------------------- |
| **Comunicación**  | EventEmitter (sync/async)  | RabbitMQ (async)                           |
| **Base de datos** | PostgreSQL compartida      | BD por servicio                            |
| **Despliegue**    | Un solo proceso            | Un proceso por micro                       |
| **Extracción**    | Copiar carpeta del dominio | Crear nuevo proyecto NestJS con la carpeta |

### Checklist para extraer un dominio

1. Copiar la carpeta del dominio completa a un nuevo proyecto NestJS.
2. Copiar `shared-kernel/` al nuevo proyecto (o publicarlo como paquete npm privado).
3. Reemplazar `EventEmitter` por `RabbitMQ` en la comunicación con otros dominios.
4. Crear su propia base de datos con las tablas que le corresponden.
5. Actualizar el monolito para consumir el nuevo micro vía RabbitMQ.
