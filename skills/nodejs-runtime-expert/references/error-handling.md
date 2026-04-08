# Error Handling — Try-Catch por Capa, Transformacion y Anti-Patrones

---

## 1. Regla General

Cada capa atrapa los errores que LE CORRESPONDEN y los transforma en algo que la capa superior entiende. Sin duplicar, sin desperdiciar.

```
┌─────────────────────────────────────────────────────────────────┐
│  CONTROLLER (Infraestructura de entrada)                        │
│  → NO usa try-catch. Los exception filters globales lo manejan. │
│  → Si necesita transformar un error especifico del framework,   │
│    puede tener try-catch puntual, pero es raro.                 │
├─────────────────────────────────────────────────────────────────┤
│  CASO DE USO (Aplicacion)                                       │
│  → Try-catch SOLO alrededor de operaciones de infraestructura   │
│    que pueden fallar (llamadas a repos, APIs externas).         │
│  → Transforma errores tecnicos en excepciones de dominio.       │
│  → NUNCA atrapa excepciones de dominio — deja que suban.        │
├─────────────────────────────────────────────────────────────────┤
│  DOMAIN SERVICE (Dominio)                                       │
│  → NO usa try-catch. Lanza excepciones de dominio directamente. │
│  → Es codigo puro — si algo esta mal, es un error de negocio.   │
├─────────────────────────────────────────────────────────────────┤
│  REPOSITORIO (Infraestructura de salida)                        │
│  → Try-catch alrededor de operaciones de DB/ORM.                │
│  → Transforma errores de DB en excepciones de dominio o         │
│    las deja subir si el filter global las maneja.               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Patron: Caso de Uso con Try-Catch Optimizado

```typescript
// src/modules/orders/application/use-cases/create-order.use-case.ts

@Injectable()
export class CreateOrderUseCase implements UseCase<CreateOrderInput, OrderResponseDto> {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepo: IOrderRepository,
    @Inject(PRODUCT_LOOKUP) private readonly productLookup: IProductLookup,
  ) {}

  execute = async (input: CreateOrderInput): Promise<OrderResponseDto> => {
    // 1. Operaciones que pueden fallar por infraestructura → try-catch
    let product: Product;
    try {
      product = await this.productLookup.findById(input.productId);
    } catch (error) {
      // Transforma error tecnico en excepcion de dominio
      throw new ServiceUnavailableException(
        `Product lookup failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    // 2. Logica de dominio — sin try-catch, deja que las excepciones suban
    if (!product) {
      throw new ProductNotFoundException(input.productId);
    }

    const order = Order.create(generateId(), product, input.quantity);
    // El metodo create() puede lanzar InsufficientStockException — NO la atrapes aqui

    // 3. Persistencia — el filter global maneja errores de DB
    await this.orderRepo.save(order);

    return OrderMapper.toResponse(order);
  };
}
```

---

## 3. Patron: Error Handling en Repositorio

```typescript
// src/modules/users/infrastructure/persistence/repositories/typeorm-user.repository.ts

export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  save = async (user: User): Promise<User> => {
    try {
      const ormEntity = UserPersistenceMapper.toOrm(user);
      const saved = await this.repo.save(ormEntity);
      return UserPersistenceMapper.toDomain(saved);
    } catch (error) {
      // Solo atrapar errores especificos con mapeo semantico
      if (
        error instanceof QueryFailedError &&
        (error as any).code === '23505' // unique_violation en PostgreSQL
      ) {
        throw new UserAlreadyExistsException(user.email);
      }
      // Errores inesperados suben al AllExceptionsFilter
      throw error;
    }
  };
}
```

---

## 4. Anti-Patron: Try-Catch que Atrapa Todo

```typescript
// ❌ MALO — atrapa TODO, pierde contexto, oculta bugs
execute = async (input: CreateOrderInput): Promise<OrderResponseDto> => {
  try {
    const product = await this.productLookup.findById(input.productId);
    const order = Order.create(generateId(), product, input.quantity);
    await this.orderRepo.save(order);
    return OrderMapper.toResponse(order);
  } catch (error) {
    // ¿Que fallo? ¿La DB? ¿La logica? ¿El mapper? No se sabe.
    throw new InternalServerErrorException('Something went wrong');
  }
};
```

**Por que es malo:**
- Oculta excepciones de dominio que deberian subir con su semantica intacta
- Pierde el stack trace y contexto del error original
- Hace imposible distinguir entre error de negocio y error de infraestructura

---

## 5. Test Cases / Criterios de Aceptacion

### TC-1: Try-Catch en la Capa Correcta

**Prompt:** "Crea un caso de uso para procesar un pago que llama a un servicio externo de pagos y guarda el resultado en la base de datos."

**Criterios:**
- El caso de uso tiene try-catch SOLO alrededor de la llamada al servicio externo, transformando errores de red/timeout en excepciones de dominio (`PaymentServiceUnavailableException`)
- La llamada al repositorio `save()` NO esta envuelta en try-catch dentro del caso de uso
- Las excepciones de dominio (ej. `InsufficientFundsException`) NO se atrapan en el caso de uso — se dejan subir
- El controller NO tiene try-catch
- La llamada al servicio externo incluye timeout con `AbortController`

### TC-2: Concurrencia con Promise.all

**Prompt:** "Tengo un caso de uso que consulta el perfil del usuario, sus ordenes y sus notificaciones para armar un dashboard. Esta lento."

**Criterios:**
- Las tres consultas se ejecutan con `Promise.all` en lugar de tres `await` secuenciales
- Si alguna consulta es opcional, se usa `Promise.allSettled` y se maneja resultado parcial
- El diagnostico explica que tres queries de ~100ms secuenciales toman ~300ms, pero con `Promise.all` toman ~100ms
- No se introduce `Promise.all` si hay dependencia de datos entre las queries

### TC-3: Deteccion de Bloqueo del Event Loop

**Prompt:** "Tengo un endpoint que parsea un archivo JSON grande que sube el usuario y lo procesa."

**Criterios:**
- Se identifica que `JSON.parse` de archivo grande (>1MB) bloquea el event loop
- Se propone alternativa: streaming JSON parser, procesamiento en chunks con `setImmediate`, o worker thread
- El codigo no usa `fs.readFileSync` ni APIs sincronas
- Se explica que mientras el event loop esta bloqueado, ningun otro request se atiende

### TC-4: Memory Leak en Event Listeners

**Prompt:** "Tengo un servicio que escucha eventos de un EventEmitter pero cuando hago hot reload, la memoria crece."

**Criterios:**
- Se identifica que el servicio agrega listeners en `onModuleInit` sin removerlos en `onModuleDestroy`
- Se implementa `OnModuleDestroy` con `removeListener` para cada listener registrado
- Se usa arrow function guardada en referencia para poder remover el listener exacto
- Se sugiere verificar con `emitter.listenerCount()` que no haya listeners duplicados

### TC-5: Saturacion del Thread Pool

**Prompt:** "Mi API hace muchas lecturas de archivos y operaciones de crypto al mismo tiempo, y bajo carga los tiempos se disparan."

**Criterios:**
- Se explica que `fs.readFile` y `crypto.pbkdf2` ambos usan el thread pool de libuv (4 hilos default)
- Se propone aumentar `UV_THREADPOOL_SIZE` como primera medida
- Se sugiere cachear lecturas que no cambian, usar crypto async, o worker threads dedicados
- Se explica la relacion: si 4 operaciones de crypto tardan 100ms cada una, la quinta espera en cola

### TC-6: Error Handling en Repositorio

**Prompt:** "Mi repositorio de TypeORM lanza errores de constraint violation y unique index. Como los manejo?"

**Criterios:**
- El repositorio atrapa errores especificos de TypeORM (ej. `QueryFailedError` con codigo de unique violation)
- Transforma el error de DB en excepcion de dominio (`UserAlreadyExistsException`)
- NO atrapa todos los errores genericamente — solo los que tienen mapeo semantico
- Errores de DB inesperados se dejan subir al `AllExceptionsFilter`
- El caso de uso NO tiene try-catch adicional para estos errores

### TC-7: Streams para Exportacion Masiva

**Prompt:** "Necesito exportar 100,000 registros como CSV. Actualmente carga todo en memoria y el servidor se queda sin memoria."

**Criterios:**
- Se usa stream de lectura desde la base de datos (cursor/stream de TypeORM)
- Se aplica `Transform` stream para convertir cada registro a linea CSV
- Se usa `pipeline` de `stream/promises` para backpressure automatico
- La respuesta HTTP se envia como stream sin acumular en buffer
- No se carga la coleccion completa en un array en ningun punto

### TC-8: Evaluacion de Optimizacion Innecesaria

**Prompt:** "Optimiza este caso de uso simple que busca un usuario por ID y retorna su perfil."

**Criterios:**
- Si el caso de uso es simple (un solo `await` + mapeo), reconoce que no hay optimizacion significativa
- NO introduce complejidad innecesaria (worker threads, streams, Promise.all de una sola operacion)
- La respuesta es honesta: "este caso de uso ya es eficiente"
