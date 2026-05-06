# Command Patterns — Casos de Uso de Escritura

> Patterns para use cases que modifican estado: create, update, delete, complete, toggle, duplicate.

---

## Patrón Base

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

- `interface XxxInput` se define en el mismo archivo, NO como DTO exportado.
- Siempre incluir `userId` en el input para validar ownership.
- Inyectar repositorios vía `@Inject(TOKEN)` con la interfaz como tipo.
- Retornar DTOs de response, nunca entidades de dominio.
- Lanzar excepciones de dominio (no `HttpException`).

---

## Subpatrón: Create

**Flujo:** generar UUID → construir entidad vía factory → persistir → mapear response.

```typescript
interface CreateOrderInput {
  userId: string;
  dto: CreateOrderDto;
}

@Injectable()
export class CreateOrderUseCase implements UseCase<
  CreateOrderInput,
  OrderResponseDto
> {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(PRICING_SERVICE)
    private readonly pricingService: IPricingService,
  ) {}

  async execute(input: CreateOrderInput): Promise<OrderResponseDto> {
    const orderId = randomUUID();

    // Obtener dependencias externas si es necesario
    const pricing = await this.pricingService.getCurrent();

    // Construir sub-entidades
    const items = (input.dto.items ?? []).map((itemDto) =>
      OrderItem.create(randomUUID(), orderId, itemDto.productName, ...),
    );

    // Crear entidad vía factory method
    const order = Order.create(orderId, input.userId, input.dto.title, items, ...);

    // Persistir
    const saved = await this.orderRepository.save(order);

    // Mapear a response DTO
    return OrderMapper.toResponse(saved);
  }
}
```

**Checklist:**

- UUID generado en el use case, no en la BD.
- Entidad creada vía `Entity.create()`, no con `new Entity()`.
- Si hay sub-entidades (items), se construyen antes de la entidad padre.
- Si depende de servicios externos, se obtienen antes de crear.

---

## Subpatrón: Update

**Flujo:** buscar por id+userId → validar existencia → aplicar cambios → persistir → mapear response.

```typescript
interface UpdateOrderInput {
  orderId: string;
  userId: string;
  dto: UpdateOrderDto;
}

@Injectable()
export class UpdateOrderUseCase implements UseCase<
  UpdateOrderInput,
  OrderResponseDto
> {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(input: UpdateOrderInput): Promise<OrderResponseDto> {
    // 1. Buscar con ownership
    const existing = await this.orderRepository.findByIdAndUserId(
      input.orderId,
      input.userId,
    );
    if (!existing) throw new OrderNotFoundException(input.orderId);

    // 2. Reconstruir entidad con cambios vía reconstitute()
    const updated = Order.reconstitute(existing.id, {
      ...existingProps,
      title: input.dto.title ?? existing.title,
    });

    // 3. Persistir y retornar
    const saved = await this.orderRepository.save(updated);
    return OrderMapper.toResponse(saved);
  }
}
```

**Checklist:**

- Siempre buscar con `findByIdAndUserId` para ownership.
- Lanzar excepción de dominio si no existe.
- Usar `reconstitute()` para aplicar cambios, no mutar la entidad directamente.
- Retornar el DTO actualizado (la UI no necesita hacer un GET adicional).

---

## Subpatrón: Delete

**Flujo:** buscar por id+userId → validar existencia → eliminar → retornar void.

```typescript
interface DeleteOrderInput {
  orderId: string;
  userId: string;
}

@Injectable()
export class DeleteOrderUseCase implements UseCase<DeleteOrderInput, void> {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(input: DeleteOrderInput): Promise<void> {
    const existing = await this.orderRepository.findByIdAndUserId(
      input.orderId,
      input.userId,
    );
    if (!existing) throw new OrderNotFoundException(input.orderId);

    await this.orderRepository.delete(input.orderId);
  }
}
```

**Checklist:**

- Validar existencia antes de eliminar.
- Si hay entidades hijas (items, relaciones), eliminarlas en cascada dentro del repositorio.
- Retornar `void`. El controller responde con `204 No Content`.

---

## Subpatrón: Action (complete, toggle, duplicate)

**Flujo:** buscar → ejecutar lógica de dominio en la entidad → persistir → mapear response.

La diferencia con Update es que la lógica vive en la entidad de dominio, no en el use case.

```typescript
interface CompleteOrderInput {
  orderId: string;
  userId: string;
}

@Injectable()
export class CompleteOrderUseCase implements UseCase<
  CompleteOrderInput,
  OrderResponseDto
> {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(input: CompleteOrderInput): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findByIdAndUserId(
      input.orderId,
      input.userId,
    );
    if (!order) throw new OrderNotFoundException(input.orderId);

    // Lógica de dominio delegada a la entidad
    const completedOrder = order.complete();

    const saved = await this.orderRepository.save(completedOrder);
    return OrderMapper.toResponse(saved);
  }
}
```

### Toggle (variante de Action)

```typescript
interface ToggleItemInput {
  parentId: string;
  itemId: string;
  userId: string;
}

@Injectable()
export class ToggleItemUseCase implements UseCase<
  ToggleItemInput,
  ParentResponseDto
> {
  constructor(
    @Inject(PARENT_REPOSITORY)
    private readonly parentRepository: IParentRepository,
  ) {}

  async execute(input: ToggleItemInput): Promise<ParentResponseDto> {
    const parent = await this.parentRepository.findByIdAndUserId(
      input.parentId,
      input.userId,
    );
    if (!parent) throw new ParentNotFoundException(input.parentId);

    const item = parent.items.find((i) => i.id === input.itemId);
    if (!item) throw new ItemNotFoundException(input.itemId);

    // Lógica delegada a entidad: toggle retorna nueva instancia
    const toggledItem = item.toggle();
    const updatedParent = parent.replaceItem(toggledItem);

    const saved = await this.parentRepository.save(updatedParent);
    return ParentMapper.toResponse(saved);
  }
}
```

**Checklist:**

- La lógica de negocio vive en métodos de la entidad (`complete()`, `toggle()`).
- El use case solo orquesta: buscar → llamar método de dominio → persistir.
- Las entidades son inmutables: los métodos retornan nuevas instancias.

---

## Error Handling en Comandos

- Lanzar excepciones de dominio: `OrderNotFoundException`, `BusinessException`.
- Las excepciones de dominio **NO** extienden `HttpException` de NestJS.
- El `DomainExceptionFilter` en `shared-kernel/filters/` traduce a HTTP.
- El controller **NO** tiene try/catch.
- DTOs inválidos se rechazan vía `ValidationPipe` antes de llegar al use case.
