---
name: nestjs-clean-architecture
description: Guía para generar código NestJS con Clean Architecture preparado para microservicios. Usa esta skill cuando el usuario pida crear módulos, entidades, repositorios, casos de uso, controladores, DTOs, adapters o cualquier componente de un proyecto NestJS con arquitectura limpia. También se activa cuando pida refactorizar código existente hacia Clean Architecture, crear nuevos dominios o módulos, implementar patrones como Repository, Adapter, Use Case, o cuando mencione separación por capas (domain, application, infrastructure). Actívala incluso si el usuario solo dice "crea un CRUD", "agrega un endpoint", "nuevo módulo" o "implementa el servicio de X" en contexto NestJS.
---

# NestJS Clean Architecture — Skill

> Guía genérica para generar código NestJS con Clean Architecture.
> Define capas, reglas de dependencia, convenciones y patrones reutilizables para cualquier proyecto.
> Para estructura específica de un proyecto, consultar su `architecture.md`.

---

## Capas y Dirección de Dependencia

```
infrastructure/ → application/ → domain/
      ↓                ↓              ↓
  Frameworks      Casos de uso    Entidades
  Controllers     DTOs            Value Objects
  Repositories    Services        Enums
  Adapters        Mappers         Interfaces (puertos)
```

**Regla de oro:** las dependencias siempre apuntan hacia adentro. El dominio nunca importa de capas externas.

---

## Capas en Detalle

### Domain (Núcleo)

La capa más interna. Puro TypeScript, sin dependencias de frameworks.

| Elemento                  | Ubicación                         | Reglas                                                                                                 |
| :------------------------ | :-------------------------------- | :----------------------------------------------------------------------------------------------------- |
| Entidades                 | `domain/entities/`                | Sin decoradores de NestJS, TypeORM ni class-validator. Factory methods (`create()`, `reconstitute()`). |
| Value Objects             | `domain/value-objects/`           | Inmutables. Validan sus propias reglas.                                                                |
| Enums                     | `domain/enums/`                   | Valores en `UPPER_SNAKE_CASE`.                                                                         |
| Interfaces de repositorio | `domain/interfaces/repositories/` | Definen el contrato (puerto). Incluyen `Symbol` token para DI.                                         |
| Interfaces de servicios   | `domain/interfaces/services/`     | Contratos de servicios externos (auth providers, APIs, etc.).                                          |
| Excepciones de dominio    | `domain/exceptions/`              | NO extienden `HttpException` de NestJS.                                                                |

```typescript
// Ejemplo: interfaz de repositorio con token
export const USER_REPOSITORY = Symbol('IUserRepository');

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByIdAndUserId(id: string, userId: string): Promise<User | null>;
  save(entity: User): Promise<User>;
  delete(id: string): Promise<void>;
}
```

```typescript
// Ejemplo: entidad con factory methods
export class User {
  private constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly firstName: string | null,
  ) {}

  static create(id: string, email: string, firstName: string | null): User {
    return new User(id, email, firstName);
  }

  static reconstitute(id: string, props: Partial<User>): User {
    return new User(id, props.email!, props.firstName ?? null);
  }
}
```

### Application (Casos de Uso)

Orquesta la lógica de negocio. Depende solo de domain.

| Elemento  | Ubicación                | Reglas                                                                      |
| :-------- | :----------------------- | :-------------------------------------------------------------------------- |
| Use Cases | `application/use-cases/` | Una clase por caso de uso. Implementa `UseCase<Input, Output>`.             |
| DTOs      | `application/dtos/`      | Decoradores de `class-validator`. Request y Response separados.             |
| Mappers   | `application/mappers/`   | Convierte entidades ↔ DTOs. Métodos estáticos `toResponse()`, `toEntity()`. |

```typescript
// Interfaz base para todos los use cases
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}
```

**Reglas de Use Cases:**

- `interface XxxInput` se define en el mismo archivo, NO como DTO exportado.
- Siempre incluir `userId` en el input para validar ownership.
- Inyectar repositorios vía `@Inject(TOKEN)` con la interfaz como tipo.
- Retornar DTOs de response, nunca entidades de dominio.
- Lanzar excepciones de dominio (no `HttpException`).

### Infrastructure (Frameworks)

Conecta con el mundo exterior. Depende de domain y application.

| Elemento     | Ubicación                      | Reglas                                                          |
| :----------- | :----------------------------- | :-------------------------------------------------------------- |
| Controllers  | `infrastructure/controllers/`  | Solo delegan al use case. Sin lógica de negocio. Sin try/catch. |
| Repositories | `infrastructure/repositories/` | Implementan la interfaz del dominio. Usan TypeORM/Prisma/etc.   |
| Adapters     | `infrastructure/adapters/`     | Implementan interfaces de servicios externos.                   |
| Consumers    | `infrastructure/consumers/`    | Listeners de colas (RabbitMQ, etc.).                            |
| Schedulers   | `infrastructure/schedulers/`   | Cron jobs y tareas programadas.                                 |

```typescript
// Ejemplo: controller que solo delega
@Controller('orders')
export class OrderController {
  constructor(
    private readonly createUseCase: CreateOrderUseCase,
    private readonly getByIdUseCase: GetOrderByIdUseCase,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentUser() userId: string, @Body() dto: CreateOrderDto) {
    return this.createUseCase.execute({ userId, dto });
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getById(@CurrentUser() userId: string, @Param('id') orderId: string) {
    return this.getByIdUseCase.execute({ orderId, userId });
  }
}
```

---

## Shared Kernel

Código transversal compartido entre dominios.

| Elemento     | Ubicación                     | Qué contiene                                                   |
| :----------- | :---------------------------- | :------------------------------------------------------------- |
| Guards       | `shared-kernel/guards/`       | AuthGuard, DeviceHeadersGuard.                                 |
| Filters      | `shared-kernel/filters/`      | DomainExceptionFilter (traduce excepciones de dominio a HTTP). |
| Interceptors | `shared-kernel/interceptors/` | Logging, transform response.                                   |
| Decorators   | `shared-kernel/decorators/`   | @CurrentUser, @Public.                                         |
| Pipes        | `shared-kernel/pipes/`        | UuidValidationPipe.                                            |
| DTOs base    | `shared-kernel/dtos/`         | PaginatedRequest, PaginatedResponse, ErrorResponse.            |
| Interfaces   | `shared-kernel/interfaces/`   | RequestContext, contratos compartidos entre dominios.          |
| Utils        | `shared-kernel/utils/`        | Crypto, Date helpers.                                          |

---

## Reglas de Dependencia entre Módulos

### ❌ Prohibido

```
orders/ → payments/        (dominios NO se importan entre sí)
payments/ → inventory/     (dominios NO se importan entre sí)
domain/ → infrastructure/  (la dependencia va hacia adentro)
domain/ → application/     (la dependencia va hacia adentro)
application/ → infrastructure/
```

### ✅ Comunicación entre dominios

Los dominios se comunican a través de mecanismos desacoplados:

| Mecanismo                       | Cuándo usarlo                                           | Ejemplo                                                |
| :------------------------------ | :------------------------------------------------------ | :----------------------------------------------------- |
| **Eventos internos**            | Monolito. Comunicación async entre módulos.             | `EventEmitter.emit('financial.created', payload)`      |
| **Interfaces en shared-kernel** | Cuando un dominio necesita datos de otro sin acoplarse. | `IUserLookup` en shared-kernel, implementado por auth. |
| **Mensajería (RabbitMQ)**       | Microservicios. Reemplaza EventEmitter al extraer.      | `@EventPattern('financial.created')`                   |

```typescript
// ✅ Correcto: orders emite evento, notifications escucha
// orders/application/use-cases/create-order.use-case.ts
this.eventEmitter.emit('order.created', {
  userId: order.userId,
  orderId: order.id,
  date: order.date,
});

// notifications/infrastructure/listeners/order.listener.ts
@OnEvent('order.created')
handleOrderCreated(payload: OrderCreatedEvent) {
  this.createReminderUseCase.execute({ ... });
}
```

> **Regla para microservicios:** si los dominios nunca se importan directamente, separar es copiar la carpeta del dominio y cambiar EventEmitter por RabbitMQ.

---

## Manejo de Errores por Capas

```
Domain Exceptions     →     DomainExceptionFilter     →     HTTP Response
(puro TS)                   (shared-kernel)                  (NestJS)
```

| Capa               | Responsabilidad                                                                       |
| :----------------- | :------------------------------------------------------------------------------------ |
| **Domain**         | Define excepciones (`NotFoundException`, `BusinessException`). NO usan HttpException. |
| **Application**    | Los use cases lanzan excepciones de dominio. Sin try/catch en controllers.            |
| **Infrastructure** | El `DomainExceptionFilter` captura y traduce a HTTP status codes.                     |

```typescript
// domain/exceptions/not-found.exception.ts
export class EntityNotFoundException extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} con id ${id} no encontrado`);
    this.name = 'EntityNotFoundException';
  }
}

// shared-kernel/filters/domain-exception.filter.ts
@Catch(EntityNotFoundException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: EntityNotFoundException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    response.status(404).json({
      error: 'Not Found',
      message: exception.message,
    });
  }
}
```

---

## Convenciones de Nombrado

| Tipo                   | Patrón archivo                     | Patrón clase                             |
| :--------------------- | :--------------------------------- | :--------------------------------------- |
| Entidad                | `{nombre}.entity.ts`               | `PascalCase` sin sufijo                  |
| Repositorio (interfaz) | `{nombre}.repository.interface.ts` | `I{Nombre}Repository`                    |
| Repositorio (impl)     | `{nombre}.repository.ts`           | `{Nombre}Repository`                     |
| Use Case               | `{acción}-{nombre}.use-case.ts`    | `{Acción}{Nombre}UseCase`                |
| DTO request            | `{acción}-{nombre}-request.dto.ts` | `{Acción}{Nombre}RequestDto`             |
| DTO response           | `{nombre}-response.dto.ts`         | `{Nombre}ResponseDto`                    |
| Controller             | `{nombre}.controller.ts`           | `{Nombre}Controller`                     |
| Adapter                | `{nombre}.adapter.ts`              | `{Nombre}Adapter`                        |
| Mapper                 | `{nombre}.mapper.ts`               | `{Nombre}Mapper`                         |
| Guard                  | `{nombre}.guard.ts`                | `{Nombre}Guard`                          |
| Filter                 | `{nombre}.filter.ts`               | `{Nombre}Filter`                         |
| Enum                   | `{nombre}.enum.ts`                 | `PascalCase`, valores `UPPER_SNAKE_CASE` |
| Module                 | `{dominio}.module.ts`              | `{Dominio}Module`                        |

**Formato general:** archivos en `kebab-case`, clases en `PascalCase`, interfaces con prefijo `I`, variables en `camelCase`, constantes en `UPPER_SNAKE_CASE`.

---

## Módulo de NestJS — Estructura

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, UserDeviceEntity])],
  controllers: [UserController],
  providers: [
    // Use Cases
    CreateUserUseCase,
    GetUserByIdUseCase,
    // Repositorios: interfaz → implementación
    { provide: USER_REPOSITORY, useClass: UserRepository },
    // Adapters: interfaz → implementación
    { provide: AUTH_SERVICE, useClass: AuthAdapter },
  ],
  exports: [CreateUserUseCase], // Solo exportar lo necesario
})
export class UserModule {}
```

---

## References

Antes de generar código, consultar los archivos de referencia según el tipo de caso de uso:

| Archivo                                                              | Cuándo consultarlo                                                                            |
| :------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| [`references/command-patterns.md`](./references/command-patterns.md) | Al crear use cases que modifican estado: create, update, delete, complete, toggle, duplicate. |
| [`references/query-patterns.md`](./references/query-patterns.md)     | Al crear use cases de lectura: getById, list, paginated, stats, compare.                      |
| [`references/test-criteria.md`](./references/test-criteria.md)       | Al validar que el código generado cumple con la arquitectura.                                 |
