# Testing Patterns — Tests por Capa con Ejemplos Completos

---

## 1. Tests Unitarios de Dominio

**Que se testea:** Entidades, Value Objects, Domain Services, Domain Events.
**Como:** TypeScript puro. Sin NestJS, sin mocks de framework. Instanciacion directa.
**Ubicacion:** `src/modules/[modulo]/domain/__tests__/`

### Test de Entidad

```typescript
// src/modules/users/domain/__tests__/user.entity.spec.ts
import { User } from '../entities/user.entity';

describe('User Entity', () => {
  it('debe crear un usuario valido', () => {
    const user = User.create('uuid-1', 'John Doe', 'john@example.com');

    expect(user.name).toBe('John Doe');
    expect(user.email.value).toBe('john@example.com');
    expect(user.isActive).toBe(true);
  });

  it('debe emitir evento UserCreated al crearse', () => {
    const user = User.create('uuid-1', 'John Doe', 'john@example.com');
    const events = user.pullDomainEvents();

    expect(events).toHaveLength(1);
    expect(events[0].constructor.name).toBe('UserCreatedEvent');
  });

  it('debe lanzar excepcion al desactivar usuario ya inactivo', () => {
    const user = User.create('uuid-1', 'John Doe', 'john@example.com');
    user.deactivate();

    expect(() => user.deactivate()).toThrow();
  });
});
```

### Test de Value Object

```typescript
// src/modules/users/domain/__tests__/email.vo.spec.ts
import { Email } from '../value-objects/email.vo';

describe('Email Value Object', () => {
  it('debe crear un email valido', () => {
    const email = Email.create('test@example.com');
    expect(email.value).toBe('test@example.com');
  });

  it('debe rechazar un email invalido', () => {
    expect(() => Email.create('not-an-email')).toThrow();
  });

  it('dos emails con el mismo valor deben ser iguales', () => {
    const email1 = Email.create('test@example.com');
    const email2 = Email.create('test@example.com');
    expect(email1.equals(email2)).toBe(true);
  });
});
```

**Regla:** si un test de dominio necesita `@nestjs/testing` o un mock de base de datos, algo esta mal en la arquitectura.

---

## 2. Tests Unitarios de Casos de Uso

**Que se testea:** Use Cases (capa de aplicacion).
**Como:** Instanciacion directa del caso de uso, inyectando mocks de los repositorios (ports).
**Ubicacion:** `src/modules/[modulo]/application/__tests__/`

### Test de Caso de Uso

```typescript
// src/modules/users/application/__tests__/create-user.use-case.spec.ts
import { CreateUserUseCase } from '../use-cases/create-user.use-case';
import { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import { CreateUserDto } from '../dtos/create-user.dto';

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

  it('debe crear un usuario cuando el email no existe', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.save.mockResolvedValue(undefined);

    const dto: CreateUserDto = { name: 'John', email: 'john@test.com' };
    const result = await useCase.execute(dto);

    expect(result).toBeDefined();
    expect(result.name).toBe('John');
    expect(result.email).toBe('john@test.com');
    expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
  });

  it('debe lanzar error si el email ya existe', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({} as any);

    const dto: CreateUserDto = { name: 'John', email: 'existing@test.com' };

    await expect(useCase.execute(dto)).rejects.toThrow();
    expect(mockUserRepository.save).not.toHaveBeenCalled();
  });
});
```

**Patron clave:** el caso de uso se instancia con `new UseCase(mockRepo)`, sin levantar NestJS. Esto valida que la DI funciona correctamente con inyeccion por constructor.

---

## 3. Tests de Integracion de Modulos

**Que se testea:** Composicion correcta del modulo NestJS — que la DI funcione, que los providers esten registrados, que los controllers respondan.
**Como:** `@nestjs/testing` con `Test.createTestingModule()`. Base de datos en memoria si aplica.
**Ubicacion:** `src/modules/[modulo]/infrastructure/__tests__/`

### Test de Integracion

```typescript
// src/modules/users/infrastructure/__tests__/users.module.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../controllers/users.controller';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface';

describe('UsersModule Integration', () => {
  let module: TestingModule;
  let controller: UsersController;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        CreateUserUseCase,
        {
          provide: USER_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn().mockResolvedValue(null),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('debe resolver el controller', () => {
    expect(controller).toBeDefined();
  });

  it('debe crear un usuario via controller', async () => {
    const result = await controller.create({
      name: 'Test',
      email: 'test@test.com',
    });
    expect(result).toBeDefined();
  });
});
```

**Regla:** en tests de integracion, los repositorios se proveen como mocks via `useValue` con el Symbol token de DI. El objetivo es validar que la composicion del modulo es correcta, no la DB.

---

## 4. Tests E2E

**Que se testea:** Flujo completo de la API — HTTP request -> controller -> use case -> repositorio -> response.
**Como:** `supertest` contra una instancia real de la app NestJS.
**Ubicacion:** `test/[modulo]/`

### Test E2E

```typescript
// test/users/users.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Users API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('debe crear un usuario con datos validos (201)', () =>
      request(app.getHttpServer())
        .post('/users')
        .send({ name: 'John Doe', email: 'john@test.com' })
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('John Doe');
          expect(res.body.email).toBe('john@test.com');
        }),
    );

    it('debe rechazar datos invalidos (400)', () =>
      request(app.getHttpServer())
        .post('/users')
        .send({ name: '', email: 'not-an-email' })
        .expect(400),
    );

    it('debe rechazar email duplicado (409)', () =>
      request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Jane', email: 'john@test.com' })
        .expect(409),
    );
  });
});
```

**Reglas E2E:**
- Configurar `ValidationPipe` exactamente como en produccion
- Limpiar estado entre tests si se usa DB real
- Solo validar flujos criticos — no duplicar lo que ya cubren los unitarios
