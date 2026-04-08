# Patterns — Patrones de Implementacion de Casos de Uso

---

## 1. Casos de Uso de Comando (Escritura)

Use cases que modifican estado: create, update, delete, complete, toggle, duplicate.

### Patron Base

Todos los use cases de comando siguen esta estructura:

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IXxxRepository } from '../../domain/interfaces/repositories/xxx.repository.interface';
import { XXX_REPOSITORY } from '../../domain/interfaces/repositories/xxx.repository.interface';

// Input type siempre como interface privada del archivo
interface XxxInput {
  userId: string;      // siempre presente para ownership
  dto?: CreateXxxDto;  // solo si hay payload del cliente
  entityId?: string;   // solo si opera sobre entidad existente
}

@Injectable()
export class XxxUseCase implements UseCase<XxxInput, XxxResponseDto> {
  constructor(
    @Inject(XXX_REPOSITORY)
    private readonly xxxRepository: IXxxRepository,
  ) {}

  async execute(input: XxxInput): Promise<XxxResponseDto> { ... }
}
```

**Reglas comunes:**
- `interface XxxInput` se define en el mismo archivo, NO como DTO exportado
- Siempre incluir `userId` en el input para validar ownership
- Inyectar repositorios via `@Inject(TOKEN)` con la interfaz como tipo
- Retornar DTOs de response, nunca entidades de dominio
- Lanzar excepciones de dominio (no `HttpException`)

### Subpatron: Create

**Flujo:** generar UUID -> construir entidad via factory -> persistir -> mapear response.

```typescript
// src/modules/shopping-lists/application/use-cases/create-shopping-list.use-case.ts

interface CreateShoppingListInput {
  userId: string;
  dto: CreateShoppingListDto;
}

@Injectable()
export class CreateShoppingListUseCase implements UseCase<
  CreateShoppingListInput,
  ShoppingListResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
    @Inject(EXCHANGE_RATE_PROVIDER)
    private readonly exchangeRateProvider: IExchangeRateProvider,
  ) {}

  async execute(input: CreateShoppingListInput): Promise<ShoppingListResponseDto> {
    const listId = randomUUID();

    // Obtener dependencias externas si es necesario
    const exchangeRate = await this.exchangeRateProvider.getCurrent();
    const rateLocalPerUsd = exchangeRate.rateLocalPerUsd;

    // Construir sub-entidades
    const items = (input.dto.items ?? []).map((itemDto) =>
      ShoppingItem.create(randomUUID(), listId, itemDto.productName, ...),
    );

    // Crear entidad via factory method
    const list = ShoppingList.create(listId, input.userId, input.dto.name, ...);

    // Persistir
    const saved = await this.shoppingListRepository.save(list);

    // Mapear a response DTO
    return ShoppingListMapper.toResponse(saved);
  }
}
```

### Subpatron: Update

**Flujo:** buscar por id+userId -> validar existencia -> aplicar cambios -> persistir -> mapear response.

```typescript
// src/modules/shopping-lists/application/use-cases/update-shopping-list.use-case.ts

interface UpdateShoppingListInput {
  listId: string;
  userId: string;
  dto: UpdateShoppingListDto;
}

@Injectable()
export class UpdateShoppingListUseCase implements UseCase<
  UpdateShoppingListInput,
  ShoppingListResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
    @Inject(EXCHANGE_RATE_PROVIDER)
    private readonly exchangeRateProvider: IExchangeRateProvider,
  ) {}

  async execute(input: UpdateShoppingListInput): Promise<ShoppingListResponseDto> {
    // 1. Buscar con ownership
    const existing = await this.shoppingListRepository.findByIdAndUserId(
      input.listId, input.userId,
    );
    if (!existing) throw new ShoppingListNotFoundException(input.listId);

    // 2. Obtener dependencias externas si datos cambiaron
    // 3. Reconstruir entidad con cambios via reconstitute()
    const updated = ShoppingList.reconstitute(existing.id, {
      ...existingProps,
      name: input.dto.name ?? existing.name,
    });

    // 4. Persistir y retornar
    const saved = await this.shoppingListRepository.save(updated);
    return ShoppingListMapper.toResponse(saved);
  }
}
```

### Subpatron: Delete

**Flujo:** buscar por id+userId -> validar existencia -> eliminar -> retornar confirmacion.

```typescript
// src/modules/shopping-lists/application/use-cases/delete-shopping-list.use-case.ts

interface DeleteShoppingListInput {
  listId: string;
  userId: string;
}

@Injectable()
export class DeleteShoppingListUseCase implements UseCase<
  DeleteShoppingListInput,
  DeleteShoppingListResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
  ) {}

  async execute(input: DeleteShoppingListInput): Promise<DeleteShoppingListResponseDto> {
    const existing = await this.shoppingListRepository.findByIdAndUserId(
      input.listId, input.userId,
    );
    if (!existing) throw new ShoppingListNotFoundException(input.listId);

    await this.shoppingListRepository.delete(input.listId);
    return { message: 'Lista borrada exitosamente' };
  }
}
```

### Subpatron: Action (complete, toggle, duplicate)

**Flujo:** buscar -> ejecutar logica de dominio en la entidad -> persistir -> mapear response.

La diferencia con Update es que la logica vive en la entidad de dominio, no en el use case.

```typescript
// src/modules/shopping-lists/application/use-cases/complete-shopping-list.use-case.ts

interface CompleteShoppingListInput {
  listId: string;
  userId: string;
}

@Injectable()
export class CompleteShoppingListUseCase implements UseCase<
  CompleteShoppingListInput,
  ShoppingListResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
    @Inject(EXCHANGE_RATE_PROVIDER)
    private readonly exchangeRateProvider: IExchangeRateProvider,
  ) {}

  async execute(input: CompleteShoppingListInput): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListRepository.findByIdAndUserId(
      input.listId, input.userId,
    );
    if (!list) throw new ShoppingListNotFoundException(input.listId);

    // Logica de dominio delegada a la entidad
    const exchangeRate = await this.exchangeRateProvider.getCurrent();
    const completedList = list.complete(exchangeRate.rateLocalPerUsd);

    const saved = await this.shoppingListRepository.save(completedList);
    return ShoppingListMapper.toResponse(saved);
  }
}
```

```typescript
// src/modules/shopping-lists/application/use-cases/toggle-shopping-item.use-case.ts

interface ToggleShoppingItemInput {
  listId: string;
  itemId: string;
  userId: string;
}

@Injectable()
export class ToggleShoppingItemUseCase
  implements UseCase<ToggleShoppingItemInput, ShoppingListResponseDto>
{
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
  ) {}

  async execute(input: ToggleShoppingItemInput): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListRepository.findByIdAndUserId(
      input.listId, input.userId,
    );
    if (!list) throw new ShoppingListNotFoundException(input.listId);

    const item = list.items.find((i) => i.id === input.itemId);
    if (!item) throw new ShoppingItemNotFoundException(input.itemId);

    // Logica delegada a entidad: toggle retorna nueva instancia
    const toggledItem = item.togglePurchased();
    const updatedList = list.replaceItem(toggledItem);

    const saved = await this.shoppingListRepository.save(updatedList);
    return ShoppingListMapper.toResponse(saved);
  }
}
```

### Error Handling en Comandos

- Lanzar excepciones de dominio: `ShoppingListNotFoundException`, `ShoppingItemNotFoundException`
- Las excepciones de dominio **NO** extienden `HttpException` de NestJS
- El `DomainExceptionFilter` en `shared-kernel/infrastructure/filters/` traduce a HTTP
- El controller **NO** tiene try/catch
- DTOs invalidos se rechazan via `ValidationPipe` antes de llegar al use case

---

## 2. Casos de Uso de Consulta (Lectura)

Use cases que leen datos sin modificar estado: getById, list, paginated, stats, compare.

### Patron Base

Los use cases de consulta son mas simples: buscar -> mapear -> retornar. Sin side effects.

```typescript
@Injectable()
export class GetXxxUseCase implements UseCase<GetXxxInput, XxxResponseDto> {
  constructor(
    @Inject(XXX_REPOSITORY)
    private readonly xxxRepository: IXxxRepository,
  ) {}

  async execute(input: GetXxxInput): Promise<XxxResponseDto> {
    const data = await this.xxxRepository.findSomething(input.userId, ...);
    return XxxMapper.toResponse(data);
  }
}
```

### Subpatron: GetById

**Flujo:** buscar por id+userId -> validar existencia -> mapear response.

```typescript
// src/modules/shopping-lists/application/use-cases/get-shopping-list-by-id.use-case.ts

interface GetShoppingListByIdInput {
  listId: string;
  userId: string;
}

@Injectable()
export class GetShoppingListByIdUseCase implements UseCase<
  GetShoppingListByIdInput,
  ShoppingListResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
  ) {}

  async execute(input: GetShoppingListByIdInput): Promise<ShoppingListResponseDto> {
    const list = await this.shoppingListRepository.findByIdAndUserId(
      input.listId, input.userId,
    );
    if (!list) throw new ShoppingListNotFoundException(input.listId);

    return ShoppingListMapper.toResponse(list);
  }
}
```

**Nota:** siempre usar `findByIdAndUserId` (no solo `findById`) para garantizar ownership.

### Subpatron: List (sin paginacion)

**Flujo:** buscar todos por userId -> mapear array.

```typescript
// src/modules/shopping-lists/application/use-cases/get-shopping-lists.use-case.ts

interface GetShoppingListsInput {
  userId: string;
}

@Injectable()
export class GetShoppingListsUseCase implements UseCase<
  GetShoppingListsInput,
  ShoppingListResponseDto[]
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
  ) {}

  async execute(input: GetShoppingListsInput): Promise<ShoppingListResponseDto[]> {
    const lists = await this.shoppingListRepository.findActiveByUserId(input.userId);
    return lists.map((list) => ShoppingListMapper.toResponse(list));
  }
}
```

### Subpatron: Paginated (historial)

**Flujo:** buscar con page/limit -> retornar `PaginatedResult` con metadata.

```typescript
// src/modules/shopping-lists/application/use-cases/get-shopping-list-history.use-case.ts

interface GetShoppingListHistoryInput {
  userId: string;
  page: number;
  limit: number;
}

@Injectable()
export class GetShoppingListHistoryUseCase implements UseCase<
  GetShoppingListHistoryInput,
  PaginatedShoppingListsResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
  ) {}

  async execute(
    input: GetShoppingListHistoryInput,
  ): Promise<PaginatedShoppingListsResponseDto> {
    const result = await this.shoppingListRepository.findCompletedByUserId(
      input.userId, input.page, input.limit,
    );

    const dto = new PaginatedShoppingListsResponseDto();
    dto.data = result.data.map((list) => ShoppingListMapper.toResponse(list));
    dto.total = result.total;
    dto.page = result.page;
    dto.limit = result.limit;
    return dto;
  }
}
```

**Interfaz de paginacion en el repositorio:**

```typescript
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

Se define junto a la interfaz del repositorio en `domain/interfaces/repositories/`.

### Subpatron: Stats / Aggregation

**Flujo:** delegar query de agregacion al repositorio -> retornar DTO de estadisticas.

La logica de agregacion (SUM, GROUP BY) vive en el repositorio concreto (infraestructura), no en el use case.

```typescript
// src/modules/shopping-lists/application/use-cases/get-spending-stats.use-case.ts

interface GetSpendingStatsInput {
  userId: string;
  period: 'week' | 'month';
}

@Injectable()
export class GetSpendingStatsUseCase implements UseCase<
  GetSpendingStatsInput,
  SpendingStatsResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
  ) {}

  async execute(input: GetSpendingStatsInput): Promise<SpendingStatsResponseDto> {
    const rows = await this.shoppingListRepository.getSpendingStats(
      input.userId, input.period,
    );
    // Mapear SpendingStatRow[] a DTO de response
    return { stats: rows };
  }
}
```

**Tipo auxiliar en el repositorio:**

```typescript
export interface SpendingStatRow {
  period: string;
  totalLocal: number;
  totalUsd: number;
  listCount: number;
}
```

### Subpatron: Compare (multiples entidades)

**Flujo:** recibir array de IDs -> buscar multiples -> calcular diferencias -> retornar DTO.

```typescript
// src/modules/shopping-lists/application/use-cases/compare-shopping-lists.use-case.ts

interface CompareShoppingListsInput {
  userId: string;
  listIds: string[];
}

@Injectable()
export class CompareShoppingListsUseCase implements UseCase<
  CompareShoppingListsInput,
  CompareShoppingListsResponseDto
> {
  constructor(
    @Inject(SHOPPING_LIST_REPOSITORY)
    private readonly shoppingListRepository: IShoppingListRepository,
  ) {}

  async execute(
    input: CompareShoppingListsInput,
  ): Promise<CompareShoppingListsResponseDto> {
    const lists = await this.shoppingListRepository.findByIdsAndUserId(
      input.listIds, input.userId,
    );
    // Logica de comparacion: agrupar items por nombre, calcular diferencias
    // Retornar DTO con las diferencias
  }
}
```

**Metodo del repositorio:**

```typescript
findByIdsAndUserId(ids: string[], userId: string): Promise<ShoppingList[]>;
```

---

## 3. Test Cases / Criterios de Aceptacion

Estos test cases validan que el codigo generado por la skill cumple con la arquitectura.

### TC-1: Ubicacion Correcta por Capa

**Prompt:** "Crea un modulo de ordenes con entidad, repositorio, caso de uso y endpoint REST."

**Criterios:**
- Entidad en `domain/entities/` sin imports de `@nestjs/`, `typeorm`, `class-validator`
- Interfaz `IOrderRepository` en `domain/interfaces/repositories/` con `Symbol` token
- Use case en `application/use-cases/`, implementa `UseCase<Input, Output>`, recibe repo via `@Inject(TOKEN)`
- DTO en `application/dtos/` con decoradores de `class-validator`
- Repositorio concreto en `infrastructure/persistence/repositories/`, implementa la interfaz
- Controller en `infrastructure/controllers/`, solo delega al use case
- Module conecta interfaz -> implementacion con `{ provide: TOKEN, useClass: Impl }`

### TC-2: Aislamiento entre Modulos

**Prompt:** "El modulo de ordenes necesita validar que el usuario existe antes de crear una orden."

**Criterios:**
- Ordenes NO importa `UsersModule` ni archivos de `src/modules/users/` directamente
- Se define interfaz `IUserLookup` en `shared-kernel/` o en `domain/interfaces/services/` del consumidor
- Users provee implementacion de `IUserLookup`
- Conexion via DI tokens, no imports directos
- Alternativa: evento de dominio o message pattern

### TC-3: Regla de Dependencia

**Prompt:** "Agrega un servicio para calcular el total con descuentos por volumen."

**Criterios:**
- Logica de calculo es funcion pura o domain service en `domain/services/`
- No usa `@Injectable()`, ni `fetch`, ni side effects
- Si descuentos vienen de fuente externa, se obtienen via interfaz de repositorio
- Use case orquesta: obtener datos -> calcular con domain service -> persistir
- Controller NO contiene logica de calculo

### TC-4: Inyeccion de Dependencias y Testabilidad

**Prompt:** "Crea GetUserByIdUseCase testeable con mocks."

**Criterios:**
- Recibe `IUserRepository` via `@Inject(USER_REPOSITORY)`
- Instanciable en test: `new GetUserByIdUseCase(mockRepo)`
- Test NO requiere levantar modulo NestJS completo
- Test verifica caso exitoso y caso "no encontrado"

### TC-5: Preparacion para Microservicios

**Prompt:** "Prepara el modulo de notificaciones como microservicio con RabbitMQ."

**Criterios:**
- Dominio y use cases NO cambian respecto a version monolitica
- Adaptador de entrada en `infrastructure/` escucha RabbitMQ con `@EventPattern()`
- Controller HTTP se mantiene opcional
- Configuracion de transporte en infraestructura, no en dominio
- Alternar monolito/microservicio cambiando solo `main.ts` y root module

### TC-6: Manejo de Errores por Capas

**Prompt:** "Implementa manejo de errores para crear un producto."

**Criterios:**
- Excepciones de dominio en `domain/exceptions/`, NO extienden `HttpException`
- Use case lanza excepciones de dominio
- `DomainExceptionFilter` en `shared-kernel/infrastructure/filters/` traduce a HTTP
- Controller NO tiene try/catch
- DTOs invalidos se rechazan via `ValidationPipe` antes del use case

### TC-7: Codigo Generado Compila

**Prompt:** Cualquier codigo generado por la skill.

**Criterios:**
- Compila sin errores de tipos (tsconfig strict)
- Imports correctos con rutas relativas validas
- Decoradores de NestJS solo en capas permitidas (aplicacion e infraestructura)
- Tipos de retorno explicitamente declarados
