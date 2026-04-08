# Mocks & Factories — Patrones de Mock, Factories y Criterios de Aceptacion

---

## 1. Mock de Repositorio (Patron Estandar)

Siempre crear el mock implementando la interfaz completa del port con `jest.Mocked<T>`. Esto garantiza que si la interfaz cambia, los tests fallan en compilacion.

```typescript
const createMockRepository = <T>(): jest.Mocked<T> => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
} as unknown as jest.Mocked<T>);
```

### Mock Inline en beforeEach

Para tests de use cases, el patron mas claro es crear el mock directamente:

```typescript
describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new CreateUserUseCase(mockUserRepository);
  });
});
```

### Mock con Comportamiento Default

Para tests de integracion donde se necesita comportamiento predefinido:

```typescript
const createMockUserRepository = (): jest.Mocked<IUserRepository> => ({
  findById: jest.fn().mockResolvedValue(null),
  findByEmail: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockImplementation(async (user) => user),
  delete: jest.fn().mockResolvedValue(undefined),
});
```

---

## 2. Factory de Entidades para Tests

Las factories crean entidades de dominio validas con defaults sensatos y overrides parciales. Evitan repetir datos de setup en cada test.

```typescript
// src/modules/users/domain/__tests__/factories/user.factory.ts
import { User } from '../../entities/user.entity';

export const createTestUser = (
  overrides: Partial<{ id: string; name: string; email: string }> = {},
): User =>
  User.create(
    overrides.id ?? 'test-uuid',
    overrides.name ?? 'Test User',
    overrides.email ?? 'test@example.com',
  );
```

### Factory con Multiples Variantes

```typescript
// src/modules/shopping-lists/domain/__tests__/factories/shopping-list.factory.ts
import { ShoppingList } from '../../entities/shopping-list.entity';

export const createTestShoppingList = (
  overrides: Partial<{
    id: string;
    userId: string;
    name: string;
    status: string;
  }> = {},
): ShoppingList =>
  ShoppingList.create(
    overrides.id ?? 'list-uuid',
    overrides.userId ?? 'user-uuid',
    overrides.name ?? 'Test List',
  );

export const createCompletedShoppingList = (
  overrides: Partial<{ id: string; userId: string }> = {},
): ShoppingList => {
  const list = createTestShoppingList(overrides);
  return list.complete(1.0); // tasa de cambio dummy
};
```

### Uso en Tests

```typescript
describe('GetShoppingListByIdUseCase', () => {
  it('debe retornar la lista si existe', async () => {
    const list = createTestShoppingList({ id: 'list-1', userId: 'user-1' });
    mockRepo.findByIdAndUserId.mockResolvedValue(list);

    const result = await useCase.execute({ listId: 'list-1', userId: 'user-1' });

    expect(result).toBeDefined();
    expect(result.id).toBe('list-1');
  });
});
```

---

## 3. Reglas de Calidad de Tests

| # | Regla | Detalle |
|---|-------|---------|
| 1 | Tests de dominio son los mas rapidos | Deben ejecutarse en milisegundos. Sin I/O, sin async innecesario. |
| 2 | Use cases SIEMPRE con mocks | Nunca una DB real. El use case se instancia con `new UseCase(mock)`. |
| 3 | E2E son los mas lentos y escasos | Solo validan flujos criticos. No duplicar lo que cubren los unitarios. |
| 4 | Minimo 2 tests por use case | Caso exitoso + caso de error principal. |
| 5 | Mocks implementan interfaz completa | Para detectar cambios de contrato en compilacion. |
| 6 | Zero `any` en mocks | Tipar todo. `jest.Mocked<IXxxRepository>` es obligatorio. |
| 7 | Tests independientes | Sin orden de ejecucion, sin estado compartido, `beforeEach` limpia todo. |

---

## 4. Test Cases / Criterios de Aceptacion

### TC-1: Test Unitario de Entidad

**Prompt:** "Crea tests para la entidad Product."

**Criterios:**
- El test esta en `modules/products/domain/__tests__/product.entity.spec.ts`
- No usa `@nestjs/testing`, ni mocks de DB, ni imports de framework
- Testea creacion, validacion de reglas de negocio, y emision de eventos
- Instancia la entidad directamente con `Product.create(...)`

### TC-2: Test de Caso de Uso con Mock

**Prompt:** "Crea tests para CreateOrderUseCase."

**Criterios:**
- El mock implementa `IOrderRepository` completo con `jest.Mocked<IOrderRepository>`
- El caso de uso se instancia con `new CreateOrderUseCase(mockRepository)`, sin levantar NestJS
- Incluye al menos: caso exitoso + caso de error (ej. producto no encontrado)
- El mock esta correctamente tipado (sin `any`)

### TC-3: Test E2E Completo

**Prompt:** "Crea tests e2e para el endpoint POST /products."

**Criterios:**
- Usa `supertest` contra una instancia real de la app
- Configura `ValidationPipe` como en produccion
- Testea: request valido (201), datos invalidos (400), y caso de conflicto si aplica
- Limpia estado entre tests
