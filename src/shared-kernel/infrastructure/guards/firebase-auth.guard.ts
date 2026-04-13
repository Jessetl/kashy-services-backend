import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as admin from 'firebase-admin';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { FIREBASE_ADMIN } from '../firebase/firebase-admin.provider';

export interface FirebaseUser {
  uid: string;
  email?: string;
  roles: string[];
}

type AuthenticatedRequest = Request & {
  user?: FirebaseUser;
};

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

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (process.env.NODE_ENV === 'development') {
      const seedUid = request.headers['x-seed-user-id'];
      if (typeof seedUid === 'string' && seedUid.trim()) {
        request.user = { uid: seedUid.trim(), roles: [] };
        return true;
      }
    }

    const authHeader = this.getAuthorizationHeader(request);
    const token = this.extractBearerToken(authHeader);

    if (!token) {
      throw new UnauthorizedException(
        'Missing or invalid authorization header',
      );
    }

    try {
      const decodedToken = await this.firebaseAdmin.auth().verifyIdToken(token);

      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        roles: this.extractRoles(decodedToken),
      } satisfies FirebaseUser;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }
  }

  private getAuthorizationHeader(request: Request): string | undefined {
    const header = (request.headers as Record<string, unknown>).authorization;

    if (typeof header === 'string') {
      return header;
    }

    if (Array.isArray(header)) {
      const firstValue: unknown = header[0];
      return typeof firstValue === 'string' ? firstValue : undefined;
    }

    return undefined;
  }

  private extractBearerToken(authorization?: string): string | undefined {
    if (!authorization) {
      return undefined;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }

  private extractRoles(decodedToken: admin.auth.DecodedIdToken): string[] {
    const rawRoles = (decodedToken as Record<string, unknown>).roles;
    if (!Array.isArray(rawRoles)) {
      return [];
    }

    return rawRoles.filter((role): role is string => typeof role === 'string');
  }
}
