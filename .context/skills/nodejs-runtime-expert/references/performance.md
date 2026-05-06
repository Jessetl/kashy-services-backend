# Performance — Event Loop, Memory Leaks y Optimización

> Patterns para diagnosticar y prevenir problemas de rendimiento en Node.js.

---

## Event Loop — No Bloquearlo

Node.js es single-threaded. Si una operación síncrona tarda, **todas** las requests esperan.

### Operaciones que bloquean

| Operación                                 | Problema                       | Solución                                |
| :---------------------------------------- | :----------------------------- | :-------------------------------------- |
| `JSON.parse()` de payloads grandes (>1MB) | Bloquea el event loop          | Usar streaming parser (`stream-json`).  |
| `crypto.pbkdf2Sync()`                     | CPU-bound síncrono             | Usar `crypto.pbkdf2()` (async).         |
| Regex complejas (backtracking)            | ReDoS — puede bloquear minutos | Simplificar regex, usar timeout.        |
| `fs.readFileSync()`                       | I/O bloqueante                 | Usar `fs.promises.readFile()`.          |
| Loops sobre arrays enormes (>100k)        | CPU-bound                      | Dividir en chunks con `setImmediate()`. |
| `Array.sort()` en arrays grandes          | CPU-bound                      | Considerar worker threads.              |

### Regla: todo lo que tenga `Sync` en el nombre está prohibido en producción

```typescript
// ❌ Bloqueante
const data = fs.readFileSync('/path/to/file', 'utf-8');
const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');

// ✅ No bloqueante
const data = await fs.promises.readFile('/path/to/file', 'utf-8');
const hash = await new Promise((resolve, reject) => {
  crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, key) => {
    err ? reject(err) : resolve(key);
  });
});
```

### Dividir trabajo pesado

```typescript
// ❌ Procesar 100k registros de golpe bloquea el event loop
const processAll = (records: Record[]): Result[] => {
  return records.map((r) => heavyComputation(r));
};

// ✅ Dividir en chunks y ceder el event loop entre cada uno
const processInChunks = async (
  records: Record[],
  chunkSize = 1_000,
): Promise<Result[]> => {
  const results: Result[] = [];

  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const chunkResults = chunk.map((r) => heavyComputation(r));
    results.push(...chunkResults);

    // Ceder el event loop para que procese otras requests
    await new Promise((resolve) => setImmediate(resolve));
  }

  return results;
};
```

### Worker Threads para CPU-bound

```typescript
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

// Cuando la operación es genuinamente CPU-bound (>100ms)
const runInWorker = <T>(workerPath: string, data: unknown): Promise<T> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, { workerData: data });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with code ${code}`));
    });
  });
};
```

---

## Memory Leaks — Prevención

### Causa #1: Event Listeners no removidos

```typescript
// ❌ Cada request agrega un listener — nunca se remueve
const handleRequest = (req: Request, res: Response) => {
  eventEmitter.on('data', (data) => {
    res.write(data);
  });
};

// ✅ Remover listener cuando ya no se necesita
const handleRequest = (req: Request, res: Response) => {
  const handler = (data: Buffer) => res.write(data);

  eventEmitter.on('data', handler);

  req.on('close', () => {
    eventEmitter.removeListener('data', handler);
  });
};
```

### Causa #2: Caches sin límite

```typescript
// ❌ Cache crece infinitamente — memoria ilimitada
const cache = new Map<string, unknown>();

const getData = async (key: string): Promise<unknown> => {
  if (cache.has(key)) return cache.get(key);

  const data = await fetchData(key);
  cache.set(key, data);
  return data;
};

// ✅ Cache con límite y expiración (LRU simple)
class LRUCache<V> {
  private readonly cache = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly maxSize: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Mover al final (más reciente)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    if (this.cache.size >= this.maxSize) {
      // Eliminar el más antiguo (primero del Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}
```

### Causa #3: Closures que retienen referencias

```typescript
// ❌ El closure retiene `hugeData` aunque solo necesita `summary`
const processData = (hugeData: Buffer) => {
  const summary = extractSummary(hugeData);

  return () => {
    // hugeData sigue vivo en memoria por el closure
    console.log(summary);
  };
};

// ✅ Extraer solo lo necesario antes del closure
const processData = (hugeData: Buffer) => {
  const summary = extractSummary(hugeData);
  // hugeData ya no se referencia — el GC puede liberarlo

  return () => {
    console.log(summary);
  };
};
```

### Causa #4: Timers no limpiados

```typescript
// ❌ Interval nunca se limpia
class PollingService {
  start() {
    setInterval(() => this.poll(), 5_000);
  }
}

// ✅ Guardar referencia y limpiar en shutdown
class PollingService {
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    this.intervalId = setInterval(() => this.poll(), 5_000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

---

## Connection Pooling

### Base de datos

```typescript
// ❌ Nueva conexión por request — lento y consume recursos
const getUser = async (id: string): Promise<User> => {
  const connection = await createConnection();
  const user = await connection.query('SELECT * FROM users WHERE id = $1', [
    id,
  ]);
  await connection.close();
  return user;
};

// ✅ Pool de conexiones reutilizables
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  max: 20, // Máximo de conexiones
  min: 5, // Mínimo idle
  idleTimeoutMillis: 30_000, // Cerrar idle después de 30s
  connectionTimeoutMillis: 5_000, // Timeout para obtener conexión
});

const getUser = async (id: string): Promise<User> => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
};
```

### HTTP Client

```typescript
import axios from 'axios';
import { Agent } from 'http';

// ✅ Reutilizar agente HTTP con keep-alive
const httpAgent = new Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30_000,
});

const apiClient = axios.create({
  baseURL: 'https://api.external.com',
  httpAgent,
  timeout: 5_000,
});
```

### Pool sizing

| Regla            | Recomendación                                            |
| :--------------- | :------------------------------------------------------- |
| **DB pool max**  | 2-4× número de CPU cores. Para 4 cores: 8-16 conexiones. |
| **HTTP sockets** | 25-50 por host. Más solo si el servicio lo permite.      |
| **Redis**        | 5-10 conexiones suele ser suficiente.                    |

---

## Monitoreo — Detectar Problemas Temprano

### Métricas clave

```typescript
// Monitorear el event loop lag
const measureEventLoopLag = (): void => {
  const start = process.hrtime.bigint();

  setImmediate(() => {
    const lag = Number(process.hrtime.bigint() - start) / 1_000_000; // ms

    if (lag > 100) {
      logger.warn(`Event loop lag alto: ${lag.toFixed(2)}ms`);
    }

    metrics.gauge('event_loop_lag_ms', lag);
  });
};

setInterval(measureEventLoopLag, 5_000);
```

### Memoria

```typescript
const reportMemory = (): void => {
  const usage = process.memoryUsage();

  metrics.gauge('memory_rss_mb', usage.rss / 1_048_576);
  metrics.gauge('memory_heap_used_mb', usage.heapUsed / 1_048_576);
  metrics.gauge('memory_heap_total_mb', usage.heapTotal / 1_048_576);

  // Alertar si heap usado supera 80% del total
  const heapPercent = (usage.heapUsed / usage.heapTotal) * 100;
  if (heapPercent > 80) {
    logger.warn(`Heap usage alto: ${heapPercent.toFixed(1)}%`);
  }
};

setInterval(reportMemory, 30_000);
```

---

## Checklist de Performance

| #   | Verificación                                            |
| :-- | :------------------------------------------------------ |
| 1   | ¿Cero métodos `*Sync()` en código de producción?        |
| 2   | ¿Pools de BD y HTTP configurados con límites?           |
| 3   | ¿Caches con tamaño máximo y TTL?                        |
| 4   | ¿Event listeners se remueven cuando ya no se necesitan? |
| 5   | ¿Timers/intervals se limpian en shutdown?               |
| 6   | ¿Operaciones CPU-bound (>100ms) delegadas a workers?    |
| 7   | ¿Event loop lag monitoreado?                            |
| 8   | ¿Memoria monitoreada con alertas?                       |
| 9   | ¿Closures no retienen datos innecesarios?               |
| 10  | ¿Graceful shutdown cierra todas las conexiones?         |
