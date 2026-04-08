# Optimization Patterns — Concurrencia, Streams, Workers, Memory & Timeout

---

## 1. Nunca Bloquees el Event Loop

El event loop debe procesar cada iteracion en <100ms. Cualquier operacion sincrona que tarde mas bloquea TODOS los requests concurrentes.

### Operaciones que Bloquean (evitar en produccion)

```typescript
// ❌ BLOQUEA — JSON.parse de payload grande (>1MB)
const data = JSON.parse(hugeString);

// ❌ BLOQUEA — Crypto sincrono
const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');

// ❌ BLOQUEA — Regex catastrofica (backtracking exponencial)
const regex = /^(a+)+$/;
regex.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaab'); // O(2^n)

// ❌ BLOQUEA — Lectura sincrona de archivos
const content = fs.readFileSync('/path/to/large-file');

// ❌ BLOQUEA — Loop sobre coleccion grande
for (const item of millionItems) { /* procesamiento pesado */ }
```

### Alternativas que No Bloquean

```typescript
// ✅ JSON parsing en stream para payloads grandes
import { pipeline } from 'stream/promises';
import { parser } from 'stream-json';

// ✅ Crypto asincrono
const hash = await promisify(crypto.pbkdf2)(password, salt, 100000, 64, 'sha512');

// ✅ Regex segura con limites
const safeRegex = /^a{1,100}$/; // Longitud acotada, sin backtracking

// ✅ Lectura asincrona
const content = await fs.promises.readFile('/path/to/file');

// ✅ Procesamiento en chunks con setImmediate
const processInChunks = async <T>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => void,
): Promise<void> => {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    chunk.forEach(fn);
    // Cede el control al event loop entre chunks
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
};
```

---

## 2. Async/Await: Concurrencia, no Secuencia

El error mas comun en codigo async es ejecutar operaciones independientes de forma secuencial cuando podrian correr en paralelo.

### Secuencial Innecesario vs. Concurrente

```typescript
// ❌ LENTO — 3 queries secuenciales (1s + 1s + 1s = 3s)
const user = await this.userRepo.findById(userId);
const orders = await this.orderRepo.findByUserId(userId);
const preferences = await this.prefRepo.findByUserId(userId);

// ✅ RAPIDO — 3 queries concurrentes (max(1s, 1s, 1s) = 1s)
const [user, orders, preferences] = await Promise.all([
  this.userRepo.findById(userId),
  this.orderRepo.findByUserId(userId),
  this.prefRepo.findByUserId(userId),
]);
```

### Cuando Usar Cada Patron

| Patron | Cuando usarlo |
|--------|--------------|
| `await` secuencial | El resultado de una operacion es input de la siguiente |
| `Promise.all` | Operaciones independientes donde TODAS deben tener exito |
| `Promise.allSettled` | Operaciones independientes donde algunas pueden fallar |
| `Promise.race` | Timeout pattern o competencia entre fuentes de datos |

### Promise.allSettled para Tolerancia Parcial a Fallos

```typescript
// Caso de uso: notificar por multiples canales (email, SMS, push)
// Si uno falla, los demas deben continuar
const notifyUser = async (input: NotifyUserDto): Promise<NotificationResult> => {
  const results = await Promise.allSettled([
    this.emailService.send(input.userId, input.message),
    this.smsService.send(input.userId, input.message),
    this.pushService.send(input.userId, input.message),
  ]);

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason);

  if (failed.length > 0) {
    this.logger.warn(`${failed.length} notifications failed`, { errors: failed });
  }

  return { sent: succeeded, failed: failed.length };
};
```

---

## 3. Thread Pool: Offload de Operaciones CPU-Intensive

Cuando una operacion es inherentemente CPU-bound (hash de passwords, procesamiento de imagenes, compresion), el event loop no puede ayudarte — hay que moverla al thread pool o a worker threads.

### Regla de Decision

```
¿La operacion tarda >10ms de CPU puro (sin I/O)?
  ├─ No → Ejecuta normalmente en el event loop
  └─ Si → ¿Es una sola invocacion o muchas concurrentes?
       ├─ Pocas → usa la version async de la API nativa (crypto, zlib)
       └─ Muchas/pesadas → usa worker_threads
```

### Crypto Async (usa el thread pool de libuv)

```typescript
// src/modules/users/infrastructure/adapters/hash.adapter.ts
import { promisify } from 'util';
import { scrypt, randomBytes } from 'crypto';

const scryptAsync = promisify(scrypt);

export class ScryptHashAdapter implements IHashService {
  hash = async (value: string): Promise<string> => {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(value, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  };

  compare = async (value: string, hash: string): Promise<boolean> => {
    const [salt, key] = hash.split(':');
    const derivedKey = (await scryptAsync(value, salt, 64)) as Buffer;
    return derivedKey.toString('hex') === key;
  };
}
```

### Worker Threads para Procesamiento Pesado

```typescript
// src/shared-kernel/infrastructure/workers/heavy-computation.worker.ts
import { parentPort, workerData } from 'worker_threads';

// Este archivo se ejecuta en un hilo separado
const result = heavyComputation(workerData);
parentPort?.postMessage(result);
```

```typescript
// src/modules/reports/infrastructure/adapters/worker-pool.adapter.ts
import { Worker } from 'worker_threads';
import { join } from 'path';

export class WorkerPoolAdapter implements IComputationService {
  compute = async <T>(data: unknown): Promise<T> =>
    new Promise((resolve, reject) => {
      const worker = new Worker(
        join(__dirname, '../workers/heavy-computation.worker.js'),
        { workerData: data },
      );

      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
}
```

---

## 4. Memory Management: Prevenir Leaks

Node.js usa garbage collection, pero ciertos patrones previenen que el GC libere memoria.

### Event Listeners que Nunca se Remueven

```typescript
// ❌ LEAK — Cada hot reload agrega otro listener
@Injectable()
export class BadService implements OnModuleInit {
  onModuleInit() {
    process.on('uncaughtException', this.handle);
  }
  // Falta OnModuleDestroy para remover el listener
}

// ✅ CORRECTO — Limpieza en OnModuleDestroy
@Injectable()
export class GoodService implements OnModuleInit, OnModuleDestroy {
  private readonly handler = (error: Error) => this.handle(error);

  onModuleInit() {
    process.on('uncaughtException', this.handler);
  }

  onModuleDestroy() {
    process.removeListener('uncaughtException', this.handler);
  }

  private handle = (error: Error) => {
    // ...
  };
}
```

### Caches sin Limite

```typescript
// ❌ LEAK — Map crece sin limite
@Injectable()
export class CacheService {
  private cache = new Map<string, unknown>(); // Crece sin limite

  set = (key: string, value: unknown) => {
    this.cache.set(key, value); // Nunca se limpia
  };
}

// ✅ CORRECTO — Map con limites y TTL
@Injectable()
export class BoundedCacheService {
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly maxSize = 1000;

  set = (key: string, value: unknown, ttlMs: number) => {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  };
}
```

---

## 5. Streams y Backpressure

Para datos grandes (exportacion CSV, procesamiento de archivos, respuestas paginadas masivas), los streams previenen cargar todo en memoria.

```typescript
// ❌ MALO — Carga todo en memoria
const exportUsers = async (): Promise<string> => {
  const users = await this.userRepo.findAll(); // 100k registros en RAM
  return users.map((u) => `${u.name},${u.email}`).join('\n');
};

// ✅ BUENO — Stream con backpressure
const exportUsers = async (res: Response): Promise<void> => {
  const stream = await this.userRepo.findAllAsStream();
  const transform = new Transform({
    objectMode: true,
    transform: (user, _encoding, callback) => {
      callback(null, `${user.name},${user.email}\n`);
    },
  });

  res.setHeader('Content-Type', 'text/csv');
  await pipeline(stream, transform, res);
};
```

---

## 6. Timeout para Servicios Externos

Toda llamada a un servicio externo (API, microservicio) debe tener timeout para evitar que un servicio caido bloquee tus recursos.

```typescript
// Patron con AbortController (nativo de Node.js)
const callExternalService = async (url: string, timeoutMs = 5000): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ServiceTimeoutException(url, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
```
