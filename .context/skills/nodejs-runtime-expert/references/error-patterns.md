# Error Patterns — Manejo de Errores por Capas

> Patterns detallados para propagación, transformación y manejo de errores en Node.js/TypeScript.

---

## Jerarquía de Errores Recomendada

```typescript
// Base: todos los errores de la app extienden de aquí
export class AppException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Dominio: reglas de negocio violadas
export class DomainException extends AppException {
  constructor(message: string, code: string) {
    super(message, code, 400);
  }
}

// Not Found
export class NotFoundException extends AppException {
  constructor(entity: string, id: string) {
    super(`${entity} con id ${id} no encontrado`, 'NOT_FOUND', 404);
  }
}

// Validación
export class ValidationException extends AppException {
  constructor(
    message: string,
    public readonly fields: Array<{ field: string; error: string }>,
  ) {
    super(message, 'VALIDATION_ERROR', 422);
  }
}

// Servicios externos
export class ExternalServiceException extends AppException {
  constructor(
    public readonly service: string,
    public readonly originalError: unknown,
    message?: string,
  ) {
    super(
      message ?? `Error en servicio externo: ${service}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
    );
  }
}
```

---

## Propagación de Errores

### Regla: transformar en los bordes, propagar en el centro

```
Adaptador externo         →  Service / Use Case  →  Controller / Entry
(transforma)                 (propaga tal cual)      (el framework captura)

catch API error              throw tal cual           ExceptionFilter traduce
→ throw ExternalService      (no try/catch)           a HTTP response
   Exception
```

### Adaptador Externo — Transforma

```typescript
export class PaymentAdapter implements IPaymentService {
  async charge(amount: number, token: string): Promise<ChargeResult> {
    try {
      const response = await this.httpClient.post('/charges', {
        amount,
        token,
      });
      return { id: response.data.id, status: 'success' };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 402) {
          throw new DomainException(
            'Fondos insuficientes',
            'INSUFFICIENT_FUNDS',
          );
        }
        if (status === 429) {
          throw new ExternalServiceException(
            'PaymentGateway',
            error,
            'Rate limit alcanzado',
          );
        }
      }
      throw new ExternalServiceException('PaymentGateway', error);
    }
  }
}
```

**Reglas del adaptador:**

- Siempre try/catch — es el borde con el mundo externo.
- Traducir errores HTTP/SDK a excepciones propias.
- Distinguir entre errores de negocio (402 → DomainException) y errores técnicos (timeout → ExternalServiceException).
- Nunca dejar pasar un `AxiosError` o `Error` genérico sin transformar.

### Service / Use Case — Propaga

```typescript
export class ProcessPaymentService {
  constructor(private readonly paymentService: IPaymentService) {}

  async execute(
    orderId: string,
    amount: number,
    token: string,
  ): Promise<PaymentResult> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundException('Order', orderId);

    // NO try/catch aquí — si paymentService falla,
    // la excepción ya está tipada y se propaga limpia
    const charge = await this.paymentService.charge(amount, token);

    order.markAsPaid(charge.id);
    await this.orderRepository.save(order);

    return OrderMapper.toPaymentResult(order);
  }
}
```

### Controller — El Framework Captura

```typescript
// ❌ Incorrecto: try/catch en controller
@Post('pay')
async pay(@Body() dto: PayDto) {
  try {
    return await this.paymentService.execute(dto.orderId, dto.amount, dto.token);
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw new HttpException(error.message, 404);
    }
    throw new HttpException('Error interno', 500);
  }
}

// ✅ Correcto: el controller solo delega
@Post('pay')
async pay(@Body() dto: PayDto) {
  return this.paymentService.execute(dto.orderId, dto.amount, dto.token);
}

// El ExceptionFilter (middleware) traduce las excepciones a HTTP automáticamente
```

---

## Error Boundaries — Cuándo SÍ usar Try/Catch

### 1. Operaciones con rollback

```typescript
const execute = async (input: TransferInput): Promise<void> => {
  const transaction = await db.startTransaction();

  try {
    await transaction.debit(input.fromAccount, input.amount);
    await transaction.credit(input.toAccount, input.amount);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error; // Re-throw después del rollback
  }
};
```

### 2. Operaciones opcionales (no deben romper el flujo principal)

```typescript
const createOrder = async (input: CreateOrderInput): Promise<Order> => {
  const order = await orderRepository.save(input);

  // Enviar email es opcional — si falla, no rompe la creación
  try {
    await emailService.sendConfirmation(order);
  } catch (error) {
    logger.warn('Email de confirmación falló', { orderId: order.id, error });
    // NO re-throw — el order ya se creó exitosamente
  }

  return order;
};
```

### 3. Parseo de datos externos no confiables

```typescript
const parseExternalPayload = (raw: string): ExternalData | null => {
  try {
    const parsed = JSON.parse(raw);
    return validateSchema(parsed) ? parsed : null;
  } catch {
    logger.warn('Payload inválido recibido', { raw: raw.substring(0, 100) });
    return null;
  }
};
```

### 4. Cleanup / Liberación de recursos

```typescript
const processFile = async (path: string): Promise<Result> => {
  const handle = await fs.open(path, 'r');

  try {
    const content = await handle.readFile('utf-8');
    return processContent(content);
  } finally {
    // finally garantiza que el recurso se libera siempre
    await handle.close();
  }
};
```

---

## Validación de Input

### En el borde (DTO / entrada)

```typescript
// Validar lo antes posible — en la entrada de la API
const validateInput = (dto: unknown): CreateOrderDto => {
  if (!dto || typeof dto !== 'object') {
    throw new ValidationException('Body inválido', []);
  }

  const { title, amount } = dto as Record<string, unknown>;
  const errors: Array<{ field: string; error: string }> = [];

  if (!title || typeof title !== 'string') {
    errors.push({ field: 'title', error: 'Es obligatorio y debe ser string' });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    errors.push({ field: 'amount', error: 'Debe ser un número positivo' });
  }

  if (errors.length > 0) {
    throw new ValidationException('Datos inválidos', errors);
  }

  return { title: title as string, amount: amount as number };
};
```

### En el dominio (invariantes de negocio)

```typescript
// Las entidades protegen sus propias reglas
class Order {
  static create(id: string, amount: number, items: OrderItem[]): Order {
    if (items.length === 0) {
      throw new DomainException(
        'Una orden debe tener al menos un item',
        'EMPTY_ORDER',
      );
    }
    if (amount < 0) {
      throw new DomainException(
        'El monto no puede ser negativo',
        'NEGATIVE_AMOUNT',
      );
    }
    return new Order(id, amount, items);
  }
}
```

---

## Unhandled Rejections — Global Safety Net

```typescript
// Registrar al inicio de la app — es la última línea de defensa
process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal('Unhandled Promise Rejection', { reason });
  // En producción: alertar, pero NO crashear inmediatamente
  // Dar tiempo para que terminen las requests en curso
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal('Uncaught Exception — shutting down', { error });
  // Aquí sí es seguro crashear después de loggear
  process.exit(1);
});
```

**Regla:** `unhandledRejection` es síntoma de un bug — significa que hay un `await` faltante o un `.catch()` olvidado. Loggear, alertar, y corregir el código.
