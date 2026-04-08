# Auth & Authorization — Firebase Auth, Guards, Roles y Decoradores

---

## 1. Filosofia de Autenticacion

Firebase Auth maneja todo el ciclo de autenticacion del lado del cliente (login, registro, recuperacion de password, OAuth providers, refresh tokens). El backend NestJS **solo verifica Firebase ID Tokens** usando Firebase Admin SDK y extrae la informacion del usuario (uid, email, custom claims).

**Lo que hace el cliente (frontend/mobile):**
- Login con email/password, Google, Apple, etc.
- Obtiene un Firebase ID Token
- Envia el token en el header `Authorization: Bearer <firebase-id-token>`

**Lo que hace el backend (NestJS):**
- Verifica el token con `firebase-admin` SDK
- Extrae `uid`, `email`, `custom claims` (roles)
- Inyecta la informacion del usuario en el request
- Protege endpoints con guards

**NOTA:** No existe un modulo `auth/` con dominio, casos de uso de login/registro, ni HashedPassword. Si se necesita almacenar datos adicionales del usuario (perfil, preferencias), eso corresponde a un modulo `users/` que es un bounded context de negocio, no de autenticacion.

---

## 2. Firebase Admin Provider y Module

### Dependencia

```bash
npm install firebase-admin
```

### Provider

```typescript
// src/shared-kernel/infrastructure/firebase/firebase-admin.provider.ts
import { Provider } from '@nestjs/common';
import * as admin from 'firebase-admin';

export const FIREBASE_ADMIN = Symbol('FIREBASE_ADMIN');

export const firebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN,
  useFactory: () => {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    return admin;
  },
};
```

### Module Global

```typescript
// src/shared-kernel/infrastructure/firebase/firebase-admin.module.ts
import { Global, Module } from '@nestjs/common';
import { firebaseAdminProvider, FIREBASE_ADMIN } from './firebase-admin.provider';

@Global()
@Module({
  providers: [firebaseAdminProvider],
  exports: [FIREBASE_ADMIN],
})
export class FirebaseAdminModule {}
```

---

## 3. Firebase Auth Guard (Global)

```typescript
// src/shared-kernel/infrastructure/guards/firebase-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as admin from 'firebase-admin';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { FIREBASE_ADMIN } from '../firebase/firebase-admin.provider';

export interface FirebaseUser {
  uid: string;
  email?: string;
  roles: string[];
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(FIREBASE_ADMIN) private readonly firebaseAdmin: typeof admin,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await this.firebaseAdmin.auth().verifyIdToken(token);

      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        roles: decodedToken.roles || [],
      } satisfies FirebaseUser;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }
  }
}
```

---

## 4. Decoradores

### @Public()

```typescript
// src/shared-kernel/infrastructure/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### @CurrentUser()

```typescript
// src/shared-kernel/infrastructure/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FirebaseUser } from '../guards/firebase-auth.guard';

export const CurrentUser = createParamDecorator(
  (data: keyof FirebaseUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: FirebaseUser = request.user;
    return data ? user?.[data] : user;
  },
);
```

### @Roles()

```typescript
// src/shared-kernel/infrastructure/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

---

## 5. Guard de Roles (RBAC con Firebase Custom Claims)

Los roles se gestionan como **custom claims** de Firebase. Se asignan desde el backend usando Firebase Admin SDK y se incluyen automaticamente en el ID Token.

```typescript
// src/shared-kernel/infrastructure/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { FirebaseUser } from './firebase-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: FirebaseUser = request.user;

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

---

## 6. Asignar Roles (Custom Claims)

```typescript
// src/modules/admin/application/use-cases/assign-role.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import { FIREBASE_ADMIN } from '../../../../shared-kernel/infrastructure/firebase/firebase-admin.provider';

interface AssignRoleInput {
  uid: string;
  roles: string[];
}

@Injectable()
export class AssignRoleUseCase implements UseCase<AssignRoleInput, void> {
  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebaseAdmin: typeof admin,
  ) {}

  async execute(input: AssignRoleInput): Promise<void> {
    await this.firebaseAdmin.auth().setCustomUserClaims(input.uid, {
      roles: input.roles,
    });
  }
}
```

---

## 7. Registro Global de Guards en app.module.ts

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { FirebaseAdminModule } from './shared-kernel/infrastructure/firebase/firebase-admin.module';
import { FirebaseAuthGuard } from './shared-kernel/infrastructure/guards/firebase-auth.guard';
import { RolesGuard } from './shared-kernel/infrastructure/guards/roles.guard';

@Module({
  imports: [
    FirebaseAdminModule, // Global — disponible en todos los modulos
    // ... otros modulos
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard, // Primero: verifica token
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Segundo: verifica roles
    },
  ],
})
export class AppModule {}
```

---

## 8. Uso en Controllers

```typescript
@Controller('admin/users')
export class AdminUsersController {
  @Get()
  @Roles('admin')
  findAll() {
    // Solo accesible por admins
  }

  @Post()
  @Roles('admin', 'super-admin')
  create(@Body() dto: CreateUserDto) {
    // Solo admins y super-admins
  }
}

@Controller('products')
export class ProductsController {
  @Get()
  @Public() // Cualquiera puede ver productos
  findAll() {}

  @Post()
  // Sin @Public() → requiere autenticacion (guard global)
  create(@Body() dto: CreateProductDto, @CurrentUser('uid') userId: string) {
    // userId viene del token Firebase verificado
  }
}
```
