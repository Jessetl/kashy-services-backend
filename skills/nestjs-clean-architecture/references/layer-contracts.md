# Layer Contracts — Estructura, Comunicacion y Composicion de Capas

---

## 1. Estructura de un Modulo

### Template de Carpetas

```
src/modules/[module-name]/
  domain/
    entities/                 # Entidades y Aggregates
    value-objects/            # Value Objects inmutables
    enums/                    # Enums del dominio
    interfaces/
      repositories/           # Interfaces de repositorio + DI token Symbol
      services/               # Interfaces de servicios externos
    services/                 # Domain Services (logica pura)
    events/                   # Domain Events
    exceptions/               # Excepciones de dominio (NO extienden HttpException)
  application/
    use-cases/                # 1 clase = 1 caso de uso
    dtos/                     # DTOs de entrada/salida
    mappers/                  # Entidad <-> DTO
    event-handlers/           # Handlers de eventos de dominio
  infrastructure/
    controllers/              # Adaptadores HTTP (REST)
    persistence/
      repositories/           # Implementaciones de repositorio (TypeORM, etc.)
      orm-entities/           # Entidades de TypeORM
      mappers/                # ORM Entity <-> Domain Entity
    adapters/                 # Clients HTTP, colas, email, etc.
    guards/                   # Guards especificos del modulo
  [module-name].module.ts     # NestJS Module (composicion y DI)
```

### Flujo de Creacion (orden estricto)

#### Paso 1: Dominio — Entidades, interfaces, excepciones

Lo primero es el nucleo de negocio. TypeScript puro, cero imports de `@nestjs/`, `typeorm`, `class-validator`.

```typescript
// src/modules/[mod]/domain/entities/[entidad].entity.ts
// src/modules/[mod]/domain/enums/[entidad]-status.enum.ts
// src/modules/[mod]/domain/interfaces/repositories/[entidad].repository.interface.ts
// src/modules/[mod]/domain/exceptions/[entidad]-not-found.exception.ts
```

**Interfaz de repositorio — patron del proyecto:**

```typescript
// src/modules/shopping-lists/domain/interfaces/repositories/shopping-list.repository.interface.ts
import { ShoppingList } from '../../entities/shopping-list.entity';

export const SHOPPING_LIST_REPOSITORY = Symbol('SHOPPING_LIST_REPOSITORY');

export interface IShoppingListRepository {
  findById(id: string): Promise<ShoppingList | null>;
  findByIdAndUserId(id: string, userId: string): Promise<ShoppingList | null>;
  findActiveByUserId(userId: string): Promise<ShoppingList[]>;
  save(shoppingList: ShoppingList): Promise<ShoppingList>;
  delete(id: string): Promise<void>;
}
```

**Regla:** el `Symbol` token para DI se define junto a la interfaz, en el mismo archivo.

#### Paso 2: Aplicacion — Casos de uso, DTOs, mappers

Ver la seccion de **Patterns** en [patterns.md](patterns.md) para patrones detallados de cada tipo de caso de uso.

```typescript
// src/modules/[mod]/application/dtos/create-[entidad].dto.ts
// src/modules/[mod]/application/dtos/[entidad]-response.dto.ts
// src/modules/[mod]/application/mappers/[entidad].mapper.ts
// src/modules/[mod]/application/use-cases/create-[entidad].use-case.ts
```

#### Paso 3: Infraestructura — Repositorios concretos, ORM entities, controllers

```typescript
// src/modules/[mod]/infrastructure/persistence/orm-entities/[entidad].orm-entity.ts
// src/modules/[mod]/infrastructure/persistence/mappers/[entidad]-persistence.mapper.ts
// src/modules/[mod]/infrastructure/persistence/repositories/typeorm-[entidad].repository.ts
// src/modules/[mod]/infrastructure/controllers/[entidad-plural].controller.ts
```

#### Paso 4: Module — Composicion con DI

Ver seccion **3. Composicion del Module y Dependency Injection** mas abajo.

#### Paso 5: App Module — Registrar el nuevo modulo

```typescript
// src/app.module.ts  ← importar [NuevoModule]
```

### Reglas de la Capa de Dominio

1. **Cero imports de framework**: si ves `@nestjs/`, `typeorm`, `class-validator`, `class-transformer` en `domain/`, algo esta mal.
2. **Entidades con factory methods**: usar `static create(...)` y `static reconstitute(...)` en vez de constructor publico.
3. **Logica de negocio encapsulada**: las entidades validan sus invariantes internamente.
4. **Excepciones propias**: NO extienden `HttpException` de NestJS. Son excepciones semanticas del negocio.
5. **Value Objects inmutables**: definidos por atributos, no por identidad.

### Ejemplo Real: Modulo shopping-lists

```
src/modules/shopping-lists/
  domain/
    entities/
      shopping-list.entity.ts
      shopping-item.entity.ts
    enums/
      shopping-list-status.enum.ts
    interfaces/
      repositories/
        shopping-list.repository.interface.ts
    exceptions/
      shopping-list-not-found.exception.ts
      shopping-item-not-found.exception.ts
  application/
    use-cases/              # 14 use cases
      create-shopping-list.use-case.ts
      get-shopping-lists.use-case.ts
      get-shopping-list-by-id.use-case.ts
      update-shopping-list.use-case.ts
      delete-shopping-list.use-case.ts
      complete-shopping-list.use-case.ts
      duplicate-shopping-list.use-case.ts
      add-items-to-shopping-list.use-case.ts
      edit-shopping-item.use-case.ts
      delete-shopping-item.use-case.ts
      toggle-shopping-item.use-case.ts
      get-shopping-list-history.use-case.ts
      compare-shopping-lists.use-case.ts
      get-spending-stats.use-case.ts
    dtos/                   # 12 DTOs
    mappers/
      shopping-list.mapper.ts
  infrastructure/
    controllers/
      shopping-lists.controller.ts
    persistence/
      orm-entities/
        shopping-list.orm-entity.ts
        shopping-item.orm-entity.ts
      mappers/
        shopping-list-persistence.mapper.ts
      repositories/
        typeorm-shopping-list.repository.ts
  shopping-lists.module.ts
```

---

## 2. Comunicacion entre Modulos

### Regla Principal

Los modulos son bounded contexts independientes. **Nunca** importar directamente archivos de otro modulo de negocio (entidades, use cases, repositorios).

### Patron Actual del Proyecto: DI Tokens Exportados

El proyecto usa un patron pragmatico: el modulo proveedor exporta un DI token, el modulo consumidor importa el module de NestJS y usa el token para inyectar.

**Modulo proveedor** define interfaz + token + implementacion:

```typescript
// src/modules/exchange-rates/domain/interfaces/exchange-rate-provider.interface.ts
import { ExchangeRate } from '../entities/exchange-rate.entity';

export const EXCHANGE_RATE_PROVIDER = Symbol('EXCHANGE_RATE_PROVIDER');

export interface IExchangeRateProvider {
  getCurrent(): Promise<ExchangeRate>;
}
```

**Modulo proveedor** exporta el token en su module:

```typescript
// src/modules/exchange-rates/exchange-rates.module.ts
@Module({
  providers: [
    { provide: EXCHANGE_RATE_PROVIDER, useClass: DolarApiExchangeRateProvider },
    GetCurrentExchangeRateUseCase,
  ],
  controllers: [ExchangeRatesController],
  exports: [EXCHANGE_RATE_PROVIDER],  // <-- exporta el token
})
export class ExchangeRatesModule {}
```

**Modulo consumidor** importa el module y usa el token:

```typescript
// src/modules/shopping-lists/shopping-lists.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([...]),
    ExchangeRatesModule,  // <-- importa el module
  ],
  providers: [...],
})
export class ShoppingListsModule {}
```

**Use case consumidor** inyecta via token:

```typescript
// src/modules/shopping-lists/application/use-cases/create-shopping-list.use-case.ts
import type { IExchangeRateProvider } from '../../../exchange-rates/domain/interfaces/exchange-rate-provider.interface';
import { EXCHANGE_RATE_PROVIDER } from '../../../exchange-rates/domain/interfaces/exchange-rate-provider.interface';

@Injectable()
export class CreateShoppingListUseCase {
  constructor(
    @Inject(EXCHANGE_RATE_PROVIDER)
    private readonly exchangeRateProvider: IExchangeRateProvider,
  ) {}
}
```

**Nota:** este patron importa la **interfaz** (type-only) del otro modulo, no implementaciones concretas. El `import type` asegura que no hay dependencia en runtime. Es un compromiso pragmatico: no es aislamiento total, pero el acoplamiento es minimo (solo interfaz + token).

### Patron Ideal: Interfaces en Shared-Kernel

Para aislamiento total, la interfaz se mueve a `shared-kernel/`:

```typescript
// src/shared-kernel/domain/interfaces/exchange-rate-provider.interface.ts
export const EXCHANGE_RATE_PROVIDER = Symbol('EXCHANGE_RATE_PROVIDER');

export interface IExchangeRateProvider {
  getCurrent(): Promise<{ rateLocalPerUsd: number; source: string }>;
}
```

Ambos modulos dependen de `shared-kernel`, nunca uno del otro. Preferible cuando:
- La interfaz es consumida por 3+ modulos
- Se prepara la migracion a microservicios
- La interfaz es estable y no cambia con frecuencia

### Patron Futuro: Eventos de Dominio

Para comunicacion asincrona (microservices-ready):

```typescript
// Modulo Users emite:
user.addDomainEvent(new UserCreatedEvent(user.id, user.email));

// Modulo Notifications escucha:
@EventPattern('user.created')
async handleUserCreated(event: UserCreatedEvent) {
  await this.sendWelcomeEmail.execute({ email: event.email });
}
```

**Ventajas:** acoplamiento cero. El emisor no sabe quien escucha.
**Cuando usar:** acciones que no requieren respuesta sincrona (notificaciones, logs, analytics).

### Resumen de Patrones de Comunicacion

| Patron | Acoplamiento | Cuando usar |
|--------|-------------|-------------|
| DI Token exportado (actual) | Bajo (solo interfaz + token) | Comunicacion sincrona entre 2 modulos |
| Interfaz en shared-kernel | Minimo (ambos dependen de shared) | Interfaz usada por 3+ modulos |
| Eventos de dominio | Cero | Acciones asincronas, microservices |

### Lo que NUNCA se debe hacer

```typescript
// PROHIBIDO: importar use cases, repositorios o entidades de otro modulo
import { CreateUserUseCase } from '../users/application/use-cases/create-user.use-case';
import { User } from '../users/domain/entities/user.entity';
import { TypeOrmUserRepository } from '../users/infrastructure/persistence/repositories/typeorm-user.repository';
```

---

## 3. Composicion del Module y Dependency Injection

### Patron del Proyecto

```typescript
// src/modules/[mod]/[mod].module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ORM entities para TypeOrmModule.forFeature
import { XxxOrmEntity } from './infrastructure/persistence/orm-entities/xxx.orm-entity';

// Token + interfaz del repositorio
import { XXX_REPOSITORY } from './domain/interfaces/repositories/xxx.repository.interface';

// Implementacion concreta del repositorio
import { TypeOrmXxxRepository } from './infrastructure/persistence/repositories/typeorm-xxx.repository';

// Todos los use cases
import { CreateXxxUseCase } from './application/use-cases/create-xxx.use-case';
import { GetXxxByIdUseCase } from './application/use-cases/get-xxx-by-id.use-case';
// ... demas use cases

// Controller
import { XxxController } from './infrastructure/controllers/xxx.controller';

// Modulos externos (si se necesita comunicacion entre modulos)
import { OtroModule } from '../otro/otro.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([XxxOrmEntity]),
    OtroModule,  // solo si se necesita un token exportado de otro modulo
  ],
  controllers: [XxxController],
  providers: [
    // Wiring de DI: interfaz -> implementacion
    {
      provide: XXX_REPOSITORY,
      useClass: TypeOrmXxxRepository,
    },
    // Registrar todos los use cases como providers
    CreateXxxUseCase,
    GetXxxByIdUseCase,
    // ... todos los demas
  ],
  exports: [XXX_REPOSITORY],  // solo si otro modulo necesita este repositorio
})
export class XxxModule {}
```

### Ejemplo Real: ShoppingListsModule

```typescript
// src/modules/shopping-lists/shopping-lists.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([ShoppingListOrmEntity, ShoppingItemOrmEntity]),
    UsersModule,
    ExchangeRatesModule,
  ],
  controllers: [ShoppingListsController],
  providers: [
    {
      provide: SHOPPING_LIST_REPOSITORY,
      useClass: TypeOrmShoppingListRepository,
    },
    CreateShoppingListUseCase,
    GetShoppingListsUseCase,
    GetShoppingListByIdUseCase,
    UpdateShoppingListUseCase,
    DeleteShoppingListUseCase,
    AddItemsToShoppingListUseCase,
    EditShoppingItemUseCase,
    DeleteShoppingItemUseCase,
    ToggleShoppingItemUseCase,
    CompleteShoppingListUseCase,
    GetShoppingListHistoryUseCase,
    DuplicateShoppingListUseCase,
    CompareShoppingListsUseCase,
    GetSpendingStatsUseCase,
  ],
  exports: [SHOPPING_LIST_REPOSITORY],
})
export class ShoppingListsModule {}
```

### Reglas de Composicion

**imports[]**
- `TypeOrmModule.forFeature([...])` con las ORM entities del modulo
- Otros modules de NestJS solo cuando se necesita un token que exportan

**controllers[]**
- Solo los controllers del modulo (adaptadores de entrada HTTP)

**providers[]**
1. **Wiring de DI** con `{ provide: TOKEN, useClass: Implementation }`
2. **Todos los use cases** registrados como providers (NestJS los inyecta automaticamente)
3. **Services de infraestructura** si los hay (adapters HTTP, email, etc.)

**exports[]**
- **Solo tokens de interfaz** (Symbol) que otros modulos necesiten
- **NUNCA** exportar use cases, repositorios concretos, ni entidades ORM
- Si ningun otro modulo necesita nada de este modulo, `exports` puede estar vacio

### Wiring de Multiples Repositorios

Si un modulo tiene mas de un aggregate con su propio repositorio:

```typescript
providers: [
  { provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository },
  { provide: ORDER_ITEM_REPOSITORY, useClass: TypeOrmOrderItemRepository },
  // use cases...
],
```

Cada interfaz tiene su propio `Symbol` token.

### Wiring de Servicios Externos

Para adapters que implementan interfaces de dominio (email, storage, etc.):

```typescript
providers: [
  { provide: EMAIL_SERVICE, useClass: SendGridEmailAdapter },
  { provide: FILE_STORAGE, useClass: S3FileStorageAdapter },
],
```

Mismo patron: interfaz + Symbol en dominio, implementacion en infraestructura.

### Registrar en app.module.ts

Todo modulo nuevo debe registrarse en el root module:

```typescript
// src/app.module.ts
@Module({
  imports: [
    // Infraestructura global
    TypeOrmModule.forRoot(databaseConfig),
    FirebaseAdminModule,
    // Modulos de negocio
    UsersModule,
    ShoppingListsModule,
    ExchangeRatesModule,
    NuevoModule,  // <-- agregar aqui
  ],
})
export class AppModule {}
```
