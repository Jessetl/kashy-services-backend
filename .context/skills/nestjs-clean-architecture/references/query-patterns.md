# Query Patterns — Casos de Uso de Lectura

> Patterns para use cases que leen datos sin modificar estado: getById, list, paginated, stats, compare.

---

## Patrón Base

Los use cases de consulta son más simples: buscar → mapear → retornar. Sin side effects.

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

---

## Subpatrón: GetById

**Flujo:** buscar por id+userId → validar existencia → mapear response.

```typescript
interface GetOrderByIdInput {
  orderId: string;
  userId: string;
}

@Injectable()
export class GetOrderByIdUseCase implements UseCase<
  GetOrderByIdInput,
  OrderResponseDto
> {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(input: GetOrderByIdInput): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findByIdAndUserId(
      input.orderId,
      input.userId,
    );
    if (!order) throw new OrderNotFoundException(input.orderId);

    return OrderMapper.toResponse(order);
  }
}
```

**Nota:** siempre usar `findByIdAndUserId` (no solo `findById`) para garantizar ownership.

---

## Subpatrón: List (sin paginación)

**Flujo:** buscar todos por userId → mapear array.

```typescript
interface GetOrdersInput {
  userId: string;
}

@Injectable()
export class GetOrdersUseCase implements UseCase<
  GetOrdersInput,
  OrderResponseDto[]
> {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(input: GetOrdersInput): Promise<OrderResponseDto[]> {
    const orders = await this.orderRepository.findActiveByUserId(input.userId);
    return orders.map((order) => OrderMapper.toResponse(order));
  }
}
```

**Cuándo usar:** cuando el dataset es pequeño y predecible (ej: registros activos de un usuario). Si puede crecer indefinidamente, usar Paginated.

---

## Subpatrón: Paginated

**Flujo:** buscar con page/limit → retornar `PaginatedResult` con metadata.

```typescript
interface GetOrderHistoryInput {
  userId: string;
  page: number;
  limit: number;
}

@Injectable()
export class GetOrderHistoryUseCase implements UseCase<
  GetOrderHistoryInput,
  PaginatedOrdersResponseDto
> {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(
    input: GetOrderHistoryInput,
  ): Promise<PaginatedOrdersResponseDto> {
    const result = await this.orderRepository.findCompletedByUserId(
      input.userId,
      input.page,
      input.limit,
    );

    const dto = new PaginatedOrdersResponseDto();
    dto.data = result.data.map((order) => OrderMapper.toResponse(order));
    dto.total = result.total;
    dto.page = result.page;
    dto.limit = result.limit;
    return dto;
  }
}
```

**Interfaz de paginación en el repositorio:**

```typescript
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

Se define junto a la interfaz del repositorio en `domain/interfaces/repositories/`.

---

## Subpatrón: Stats / Aggregation

**Flujo:** delegar query de agregación al repositorio → retornar DTO de estadísticas.

La lógica de agregación (SUM, GROUP BY) vive en el repositorio concreto (infraestructura), no en el use case.

```typescript
interface GetSalesStatsInput {
  userId: string;
  period: 'week' | 'month';
}

@Injectable()
export class GetSalesStatsUseCase implements UseCase<
  GetSalesStatsInput,
  SalesStatsResponseDto
> {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(input: GetSalesStatsInput): Promise<SalesStatsResponseDto> {
    const rows = await this.orderRepository.getSalesStats(
      input.userId,
      input.period,
    );
    return { stats: rows };
  }
}
```

**Tipo auxiliar en el repositorio:**

```typescript
export interface StatsRow {
  period: string;
  totalAmount: number;
  recordCount: number;
}
```

**Regla:** las queries complejas (joins, aggregations) viven en la implementación del repositorio (infrastructure), no en el use case. El use case solo invoca el método y mapea el resultado.

---

## Subpatrón: Compare (múltiples entidades)

**Flujo:** recibir array de IDs → buscar múltiples → calcular diferencias → retornar DTO.

```typescript
interface CompareEntitiesInput {
  userId: string;
  entityIds: string[];
}

@Injectable()
export class CompareEntitiesUseCase implements UseCase<
  CompareEntitiesInput,
  CompareEntitiesResponseDto
> {
  constructor(
    @Inject(ENTITY_REPOSITORY)
    private readonly entityRepository: IEntityRepository,
  ) {}

  async execute(
    input: CompareEntitiesInput,
  ): Promise<CompareEntitiesResponseDto> {
    const entities = await this.entityRepository.findByIdsAndUserId(
      input.entityIds,
      input.userId,
    );

    if (entities.length !== input.entityIds.length) {
      throw new EntityNotFoundException('Una o más entidades no encontradas');
    }

    // Lógica de comparación: agrupar por criterio, calcular diferencias
    // Retornar DTO con matched, unmatched y summary
  }
}
```

**Método del repositorio:**

```typescript
findByIdsAndUserId(ids: string[], userId: string): Promise<Entity[]>;
```

**Checklist:**

- Validar que todas las entidades existen y pertenecen al usuario.
- La lógica de comparación puede vivir en un domain service si es compleja.
- El response separa elementos que hacen match de los que no.

---

## Mapper — Patrón de Referencia

Cada dominio tiene un mapper que convierte entidades a DTOs y viceversa.

```typescript
export class OrderMapper {
  static toResponse(entity: Order): OrderResponseDto {
    return {
      id: entity.id,
      title: entity.title,
      status: entity.status,
      items: entity.items.map(ItemMapper.toResponse),
    };
  }

  static toSummaryResponse(entity: Order): OrderSummaryResponseDto {
    return {
      id: entity.id,
      title: entity.title,
      itemsCount: entity.items.length,
      total: entity.calculateTotal(),
    };
  }
}
```

**Reglas:**

- Métodos estáticos, sin estado.
- Un mapper por entidad de dominio.
- Diferentes métodos para diferentes niveles de detalle (`toResponse` vs `toSummaryResponse`).
- Vive en `application/mappers/`.
