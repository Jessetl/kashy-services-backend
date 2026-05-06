# External Services — Resiliencia con Servicios de Terceros

> Patterns para manejar errores, reintentos, timeouts y fallbacks con APIs y servicios externos.

---

## Timeout — Siempre configurar

Toda llamada HTTP externa debe tener un timeout explícito. Sin timeout, una API caída bloquea tu proceso indefinidamente.

```typescript
// ❌ Sin timeout — si el servicio cuelga, tu request también
const response = await axios.get('https://api.external.com/data');

// ✅ Timeout explícito
const response = await axios.get('https://api.external.com/data', {
  timeout: 5_000, // 5 segundos
});
```

### Timeouts recomendados

| Tipo de servicio   | Timeout | Justificación                                     |
| :----------------- | :------ | :------------------------------------------------ |
| APIs REST internas | 3-5s    | Si tu propio servicio tarda más, hay un problema. |
| APIs REST externas | 5-10s   | Redes variables, pero no esperar eternamente.     |
| Servicios de pago  | 15-30s  | Procesan transacciones — necesitan más margen.    |
| Uploads / archivos | 30-60s  | Depende del tamaño del archivo.                   |
| Webhooks salientes | 5-10s   | Si el receptor es lento, reintentar después.      |

---

## Retry — Con Backoff Exponencial

No todos los errores merecen reintento. Solo reintentar errores transitorios.

### Qué reintentar y qué no

| Reintentar ✅               | No reintentar ❌       |
| :-------------------------- | :--------------------- |
| `408` Request Timeout       | `400` Bad Request      |
| `429` Too Many Requests     | `401` Unauthorized     |
| `500` Internal Server Error | `403` Forbidden        |
| `502` Bad Gateway           | `404` Not Found        |
| `503` Service Unavailable   | `422` Validation Error |
| Network errors (ECONNRESET) | Errores de negocio     |

### Implementación genérica

```typescript
interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 10_000,
};

const withRetry = async <T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === config.maxAttempts;
      const isRetryable =
        config.retryableErrors?.(error) ?? isTransientError(error);

      if (isLastAttempt || !isRetryable) {
        throw error;
      }

      const delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt - 1),
        config.maxDelayMs,
      );

      // Jitter: ±25% para evitar thundering herd
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);

      await sleep(delay + jitter);
    }
  }

  throw new Error('Unreachable');
};

const isTransientError = (error: unknown): boolean => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    return !status || [408, 429, 500, 502, 503].includes(status);
  }
  return false;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
```

### Uso

```typescript
const fetchExchangeRate = async (): Promise<ExchangeRate> => {
  return withRetry(
    () => axios.get('https://api.exchange.com/v1/rate', { timeout: 5_000 }),
    { maxAttempts: 3, baseDelayMs: 1_000 },
  );
};
```

---

## Circuit Breaker

Cuando un servicio está caído, no seguir intentando — solo agregas carga a un sistema ya en problemas.

### Estados del Circuit Breaker

```
CLOSED (normal)  →  OPEN (servicio caído)  →  HALF-OPEN (probando)
     ↑                                              |
     └──────────── si funciona ←────────────────────┘
```

| Estado        | Comportamiento                                                                                              |
| :------------ | :---------------------------------------------------------------------------------------------------------- |
| **CLOSED**    | Requests pasan normal. Si fallan N veces seguidas, cambia a OPEN.                                           |
| **OPEN**      | Todas las requests fallan inmediatamente sin llamar al servicio. Después de un timeout, cambia a HALF-OPEN. |
| **HALF-OPEN** | Deja pasar una request de prueba. Si funciona → CLOSED. Si falla → OPEN de nuevo.                           |

### Implementación

```typescript
interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
}

class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;

      if (elapsed < this.options.resetTimeoutMs) {
        throw new ExternalServiceException(
          'CircuitBreaker',
          null,
          'Servicio temporalmente no disponible',
        );
      }

      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```

### Uso

```typescript
const exchangeRateBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: 30_000, // 30 segundos en OPEN antes de probar
});

const getRate = async (): Promise<number> => {
  return exchangeRateBreaker.execute(() =>
    axios.get('https://api.exchange.com/rate', { timeout: 5_000 }),
  );
};
```

---

## Fallback — Plan B

Cuando el servicio principal falla, tener una alternativa.

```typescript
const getExchangeRate = async (): Promise<ExchangeRate> => {
  try {
    // Intento 1: API principal
    return await primaryApi.getRate();
  } catch (primaryError) {
    logger.warn('API principal falló, usando fallback', {
      error: primaryError,
    });

    try {
      // Intento 2: API alternativa
      return await fallbackApi.getRate();
    } catch (fallbackError) {
      logger.warn('Fallback también falló, usando cache', {
        error: fallbackError,
      });

      // Intento 3: último valor en cache
      const cached = await cache.get<ExchangeRate>('exchange_rate');
      if (cached) return cached;

      // Nada funciona
      throw new ExternalServiceException(
        'ExchangeRate',
        fallbackError,
        'No se pudo obtener la tasa de cambio de ninguna fuente',
      );
    }
  }
};
```

### Cadena de fallback recomendada

```
API principal → API alternativa → Cache local → Error con contexto
```

**Regla:** siempre loggear cada fallback para saber que estás en modo degradado.

---

## Cache para Servicios Externos

Reducir llamadas a APIs externas con cache de corta duración.

```typescript
class CachedExternalService<T> {
  private cache: T | null = null;
  private cacheExpiry = 0;

  constructor(
    private readonly fetcher: () => Promise<T>,
    private readonly ttlMs: number,
    private readonly serviceName: string,
  ) {}

  async get(): Promise<T> {
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    try {
      const data = await this.fetcher();
      this.cache = data;
      this.cacheExpiry = Date.now() + this.ttlMs;
      return data;
    } catch (error) {
      // Si el fetch falla pero hay cache expirado, usarlo como fallback
      if (this.cache) {
        logger.warn(`${this.serviceName}: usando cache expirado como fallback`);
        return this.cache;
      }
      throw error;
    }
  }

  invalidate(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }
}
```

### Uso

```typescript
const exchangeRateCache = new CachedExternalService(
  () => dolarApi.getOfficialRate(),
  10 * 60 * 1_000, // 10 minutos TTL
  'DolarAPI',
);

const rate = await exchangeRateCache.get();
```

---

## Checklist de Resiliencia

| #   | Verificación                                                      |
| :-- | :---------------------------------------------------------------- |
| 1   | ¿Toda llamada HTTP tiene timeout explícito?                       |
| 2   | ¿Los errores transitorios se reintentan con backoff?              |
| 3   | ¿Hay circuit breaker para servicios críticos?                     |
| 4   | ¿Existe fallback (cache, API alternativa)?                        |
| 5   | ¿Se loggea cada fallo con servicio, error y contexto?             |
| 6   | ¿Los errores externos se traducen a excepciones propias?          |
| 7   | ¿El adaptador nunca deja pasar errores genéricos sin transformar? |
