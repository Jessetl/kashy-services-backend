---
name: nodejs-runtime-expert
description: Guía para escribir código Node.js/TypeScript robusto, seguro y performante. Usa esta skill cuando el usuario pida crear código backend en Node.js, TypeScript o NestJS. Se activa para manejo de errores, try/catch, async/await, promesas, error propagation, validaciones, memory leaks, event loop, performance, servicios externos, retry patterns, graceful shutdown o cualquier aspecto de calidad de runtime. También se activa cuando el usuario diga "por qué falla", "se queda colgado", "memory leak", "no responde", "timeout", "unhandled rejection", "error handling" o cualquier problema de ejecución en Node.js. Actívala incluso para revisiones de código donde se deba validar robustez y buenas prácticas de runtime.
---

# Node.js Runtime Expert — Skill

> Guía genérica para escribir código Node.js/TypeScript robusto.
> Define convenciones ES6+, manejo de errores por capas, async patterns, performance y resiliencia.
> Aplica a cualquier proyecto Node.js independientemente de su arquitectura.

---

## Convenciones ES6+ / TypeScript

### Reglas Generales

| Regla             | Correcto                                                                   | Incorrecto                                                        |
| :---------------- | :------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| Variables         | `const` por defecto, `let` solo si muta                                    | `var` nunca                                                       |
| Funciones         | Arrow functions para callbacks y lambdas                                   | `function` solo para métodos de clase o cuando se necesita `this` |
| Strings           | Template literals `` `Hello ${name}` ``                                    | Concatenación con `+`                                             |
| Destructuring     | `const { id, name } = user;`                                               | `const id = user.id;`                                             |
| Spread            | `const merged = { ...defaults, ...overrides };`                            | `Object.assign()`                                                 |
| Módulos           | `import/export` (ESM)                                                      | `require/module.exports` (CJS) solo si el entorno lo exige        |
| Nullish           | `value ?? 'default'`                                                       | `value \|\| 'default'` (falla con `0`, `''`, `false`)             |
| Optional chaining | `user?.address?.city`                                                      | `user && user.address && user.address.city`                       |
| Async/Await       | `async/await` siempre                                                      | `.then().catch()` solo para composición avanzada                  |
| Iteración         | `for...of` para arrays, `.map()/.filter()/.reduce()` para transformaciones | `for (let i = 0; ...)` solo si necesitas índice                   |
| Tipos             | Tipos explícitos en firmas públicas. Inferencia en variables locales.      | `any` nunca. `unknown` cuando el tipo es desconocido.             |

### Ejemplo de Estilo

```typescript
// ✅ Correcto
const fetchUser = async (userId: string): Promise<User | null> => {
  const { data } = await httpClient.get<User>(`/users/${userId}`);
  return data ?? null;
};

// ❌ Incorrecto
async function fetchUser(userId) {
  var response = await httpClient.get('/users/' + userId);
  if (response.data) {
    return response.data;
  } else {
    return null;
  }
}
```

---

## Manejo de Errores — Principios

### Regla #1: No silenciar errores

```typescript
// ❌ Silencia el error — el sistema falla sin pistas
try {
  await saveRecord(data);
} catch (error) {
  // vacío o solo console.log
}

// ✅ Propaga, transforma o maneja con intención
try {
  await saveRecord(data);
} catch (error) {
  logger.error('Failed to save record', { error, data });
  throw new PersistenceException('No se pudo guardar el registro');
}
```

### Regla #2: Try/catch solo donde puedes hacer algo útil

| Capa                            | ¿Try/catch? | ¿Qué hace?                                                               |
| :------------------------------ | :---------: | :----------------------------------------------------------------------- |
| **Controller / Entry point**    |     ❌      | No. Delega al framework (exception filters, middleware).                 |
| **Use case / Service**          | ⚠️ Rara vez | Solo si necesita transformar el error a uno de dominio o hacer rollback. |
| **Adaptador externo**           |    ✅ Sí    | Captura errores de terceros y los traduce a errores propios.             |
| **Infraestructura (BD, cache)** |    ✅ Sí    | Captura errores de conexión, timeout, constraints.                       |

### Regla #3: Errores tipados

```typescript
// ✅ Clases de error con contexto
export class ExternalServiceException extends Error {
  constructor(
    public readonly service: string,
    public readonly originalError: unknown,
    message?: string,
  ) {
    super(message ?? `Error en servicio externo: ${service}`);
    this.name = 'ExternalServiceException';
  }
}

// ✅ Uso
throw new ExternalServiceException(
  'PaymentGateway',
  error,
  'Timeout al procesar pago',
);
```

### Regla #4: Never throw inside a constructor

```typescript
// ❌ El constructor lanza — objeto queda en estado inconsistente
class User {
  constructor(email: string) {
    if (!email.includes('@')) throw new Error('Email inválido');
    this.email = email;
  }
}

// ✅ Factory method que valida antes de crear
class User {
  private constructor(public readonly email: string) {}

  static create(email: string): User {
    if (!email.includes('@')) throw new ValidationException('Email inválido');
    return new User(email);
  }
}
```

---

## Async/Await — Patterns y Trampas

### Ejecución secuencial vs paralela

```typescript
// ❌ Secuencial innecesario — cada await espera al anterior
const users = await fetchUsers();
const orders = await fetchOrders();
const stats = await fetchStats();

// ✅ Paralelo cuando no hay dependencia entre llamadas
const [users, orders, stats] = await Promise.all([
  fetchUsers(),
  fetchOrders(),
  fetchStats(),
]);
```

### Promise.allSettled para tolerancia a fallos

```typescript
// ✅ Cuando quieres resultados parciales, no que uno falle todo
const results = await Promise.allSettled([
  sendEmail(user1),
  sendEmail(user2),
  sendEmail(user3),
]);

const failed = results.filter((r) => r.status === 'rejected');
if (failed.length > 0) {
  logger.warn(`${failed.length} emails fallaron`, { failed });
}
```

### Nunca fire-and-forget sin manejo

```typescript
// ❌ Si falla, nadie se entera (unhandled rejection)
sendNotification(userId);

// ✅ Opción A: await
await sendNotification(userId);

// ✅ Opción B: fire-and-forget consciente con catch
sendNotification(userId).catch((error) =>
  logger.error('Notification failed', { userId, error }),
);
```

> Para más patterns de async, errores de servicios externos y retry, consultar:
>
> - [`references/error-patterns.md`](./references/error-patterns.md)
> - [`references/external-services.md`](./references/external-services.md)

---

## Performance — Resumen

Los problemas de performance en Node.js casi siempre caen en una de estas categorías:

| Problema                  | Síntoma                            | Causa común                                                                   |
| :------------------------ | :--------------------------------- | :---------------------------------------------------------------------------- |
| **Event loop blocking**   | API no responde, latencia alta     | Operaciones síncronas pesadas (JSON parse grande, crypto, regex).             |
| **Memory leaks**          | Memoria crece sin parar, OOM kills | Listeners no removidos, caches sin límite, closures que retienen referencias. |
| **Connection exhaustion** | Timeouts, "too many connections"   | Pool de BD/HTTP no configurado, conexiones no cerradas.                       |
| **Unhandled rejections**  | Proceso se muere sin explicación   | Promesas sin `.catch()` o `await` faltante.                                   |

> Para diagnóstico detallado, patterns y soluciones, consultar:
>
> - [`references/performance.md`](./references/performance.md)

---

## Graceful Shutdown

Todo proceso Node.js debe manejar el cierre limpio:

```typescript
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  // 1. Dejar de aceptar nuevas conexiones
  server.close();

  // 2. Esperar que terminen las requests en curso (timeout de seguridad)
  await Promise.race([
    waitForActiveRequests(),
    new Promise((resolve) => setTimeout(resolve, 30_000)),
  ]);

  // 3. Cerrar conexiones externas
  await database.close();
  await messageQueue.close();
  await cache.close();

  logger.info('Shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

**Reglas:**

- Siempre cerrar conexiones a BD, caches y colas antes de salir.
- Timeout de seguridad (30s) para requests que no terminan.
- Nunca `process.exit()` sin cerrar recursos.
- Registrar ambos: `SIGTERM` (deploy/containers) y `SIGINT` (Ctrl+C local).

---

## References

Antes de escribir código, consultar los archivos de referencia según la necesidad:

| Archivo                                                                | Cuándo consultarlo                                                                       |
| :--------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| [`references/error-patterns.md`](./references/error-patterns.md)       | Manejo de errores por capas, propagación, transformación, validación y error boundaries. |
| [`references/external-services.md`](./references/external-services.md) | Retry, circuit breaker, timeout, fallback y resiliencia con servicios de terceros.       |
| [`references/performance.md`](./references/performance.md)             | Event loop, memory leaks, connection pooling, profiling y optimización.                  |
