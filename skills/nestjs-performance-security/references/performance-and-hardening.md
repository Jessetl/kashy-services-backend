# Performance & Hardening — Rate Limiting, Caching, Seguridad HTTP, Validacion, Logging y Exception Filter

---

## 1. Rate Limiting y Throttling

### Configuracion Global con @nestjs/throttler

```typescript
// src/app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 segundo
        limit: 3,    // 3 requests por segundo
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 segundos
        limit: 20,   // 20 requests por 10 segundos
      },
      {
        name: 'long',
        ttl: 60000,  // 1 minuto
        limit: 100,  // 100 requests por minuto
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

### Rate Limiting Especifico por Endpoint

```typescript
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('products')
export class ProductsController {
  @Get()
  @SkipThrottle() // Endpoint de lectura sin limite
  findAll() {}

  @Post()
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 creaciones por minuto
  create(@Body() dto: CreateProductDto) {}
}
```

---

## 2. Caching

### Con Cache Manager

```typescript
// En el modulo
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 60000, // 60 segundos por defecto
      max: 100,   // maximo 100 items en cache
    }),
  ],
})
export class ProductsModule {}
```

### Interceptor de Cache en Controller

```typescript
import { CacheInterceptor, CacheTTL, CacheKey } from '@nestjs/cache-manager';

@Controller('products')
@UseInterceptors(CacheInterceptor)
export class ProductsController {
  @Get()
  @CacheTTL(30000) // 30 segundos
  findAll() {}

  @Get(':id')
  @CacheKey('product-detail')
  findOne(@Param('id') id: string) {}
}
```

### Cache Manual via Adapter (Clean Architecture)

```typescript
// Domain interface (port)
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  del(key: string): Promise<void>;
}
export const CACHE_SERVICE = Symbol('CACHE_SERVICE');
```

---

## 3. Seguridad HTTP: Helmet y CORS

### Configuracion en main.ts

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);

  // Seguridad HTTP headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // Validacion global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Elimina propiedades no decoradas
      forbidNonWhitelisted: true, // Rechaza propiedades extra
      transform: true,            // Transforma payloads a instancias de DTO
    }),
  );

  // Prefijo global
  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT || 3000);
};
bootstrap();
```

---

## 4. Validacion y Sanitizacion de Datos

```typescript
// En DTOs de aplicacion
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}
```

---

## 5. Compresion de Respuestas

```typescript
// src/main.ts
import compression from 'compression';

app.use(compression());
```

---

## 6. Paginacion Estandar (Shared Kernel)

```typescript
// src/shared-kernel/application/pagination.dto.ts
import { IsOptional, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @IsPositive()
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  page?: number = 1;

  get offset(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}

export class PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

## 7. Logging y Monitoreo

### Interceptor de Logging Global

```typescript
// src/shared-kernel/infrastructure/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const userId = request.user?.uid || 'anonymous';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        this.logger.log(
          `${method} ${url} ${response.statusCode} - ${Date.now() - now}ms [user: ${userId}]`,
        );
      }),
    );
  }
}
```

---

## 8. Exception Filter Global

```typescript
// src/shared-kernel/infrastructure/filters/domain-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../../domain/exceptions/domain.exception';
import { NotFoundException } from '../../domain/exceptions/not-found.exception';
import { ConflictException } from '../../domain/exceptions/conflict.exception';
import { ValidationException } from '../../domain/exceptions/validation.exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('DomainException');

  private readonly statusMap = new Map<string, number>([
    [NotFoundException.name, HttpStatus.NOT_FOUND],
    [ConflictException.name, HttpStatus.CONFLICT],
    [ValidationException.name, HttpStatus.BAD_REQUEST],
  ]);

  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      this.statusMap.get(exception.constructor.name) ||
      HttpStatus.INTERNAL_SERVER_ERROR;

    this.logger.warn(`${exception.constructor.name}: ${exception.message}`);

    response.status(status).json({
      statusCode: status,
      error: exception.constructor.name,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 9. Test Cases / Criterios de Aceptacion

### TC-1: Firebase Auth sin Contaminar Dominio

**Prompt:** "Agrega autenticacion Firebase al modulo de productos."

**Criterios:**
- El guard `FirebaseAuthGuard` esta en `shared-kernel/infrastructure/guards/`, NO en el modulo de productos
- El controller de productos no tiene logica de autenticacion — usa el guard global
- Las entidades de dominio de productos no importan nada de Firebase
- Los endpoints publicos usan `@Public()`
- El caso de uso recibe `userId: string`, no un `DecodedIdToken` de Firebase

### TC-2: Roles con Firebase Custom Claims

**Prompt:** "Solo los admins pueden eliminar productos."

**Criterios:**
- El endpoint `DELETE /products/:id` usa `@Roles('admin')`
- El `RolesGuard` lee roles de `request.user.roles` (extraidos del token Firebase)
- No hay logica de roles en el caso de uso ni en el dominio
- Los roles se asignan via `firebase-admin.auth().setCustomUserClaims()` en use case administrativo separado

### TC-3: Rate Limiting en Endpoints Sensibles

**Prompt:** "Limita la creacion de recursos a 10 por minuto por usuario."

**Criterios:**
- Se usa `@nestjs/throttler` con limites especificos en el endpoint POST
- El throttling se aplica globalmente con excepcion de endpoints de lectura
- El controller no contiene logica de throttling manual

### TC-4: Caching con Clean Architecture

**Prompt:** "Agrega cache al endpoint GET /products."

**Criterios:**
- El cache se implementa como interceptor en infraestructura
- Si el caso de uso necesita invalidar cache, se define `ICacheService` en el dominio
- El dominio NO importa `@nestjs/cache-manager` ni Redis
- La implementacion concreta esta en infraestructura

### TC-5: Rechazo de Auth Self-Managed

**Prompt:** "Crea un endpoint de login con email y password."

**Criterios:**
- El skill detecta que el login lo maneja Firebase Auth del lado del cliente
- NO crea endpoints de login, registro ni manejo de passwords
- Explica que el cliente usa Firebase SDK para autenticarse y envia el ID Token al backend
- Si el usuario insiste, sugiere endpoint proxy a Firebase Auth REST API como alternativa con advertencia

### TC-6: Validacion Estricta

**Prompt:** "Asegura que ningun campo extra pase a los endpoints."

**Criterios:**
- `ValidationPipe` configurado con `whitelist: true` y `forbidNonWhitelisted: true`
- Los DTOs usan decoradores de `class-validator`
- Se aplica `@Transform()` para sanitizar (trim, lowercase en email)
