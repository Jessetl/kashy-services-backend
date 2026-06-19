import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ValidationException } from '../../../../shared-kernel/domain/exceptions/validation.exception';
import {
  FirebaseAuthResult,
  FirebaseGoogleSignInResult,
  FirebaseRefreshResult,
  FirebaseSignInInput,
  FirebaseSignUpInput,
  IFirebaseAuthService,
} from '../../domain/interfaces/services/firebase-auth.service.interface';
import { FIREBASE_ADMIN } from '../../../../shared-kernel/infrastructure/firebase/firebase-admin.provider';

const IDENTITY_TOOLKIT_BASE =
  'https://identitytoolkit.googleapis.com/v1/accounts';
const SECURE_TOKEN_BASE = 'https://securetoken.googleapis.com/v1/token';

interface IdentityToolkitAuthResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email: string;
}

interface SecureTokenResponse {
  id_token: string;
  refresh_token: string;
  expires_in: string;
  user_id: string;
}

interface SignInWithIdpResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email: string;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  displayName?: string;
  photoUrl?: string;
}

interface FirebaseErrorResponse {
  error?: {
    code?: number;
    message?: string;
  };
}

@Injectable()
export class FirebaseAuthService implements IFirebaseAuthService {
  private readonly logger = new Logger(FirebaseAuthService.name);

  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebaseAdmin: typeof admin,
  ) {}

  async signUp(input: FirebaseSignUpInput): Promise<FirebaseAuthResult> {
    return this.callIdentityToolkit(
      'signUp',
      {
        email: input.email,
        password: input.password,
        returnSecureToken: true,
      },
      input.displayName,
    );
  }

  async signIn(input: FirebaseSignInInput): Promise<FirebaseAuthResult> {
    return this.callIdentityToolkit('signInWithPassword', {
      email: input.email,
      password: input.password,
      returnSecureToken: true,
    });
  }

  async refreshIdToken(refreshToken: string): Promise<FirebaseRefreshResult> {
    const apiKey = this.getApiKey();
    const url = `${SECURE_TOKEN_BASE}?key=${apiKey}`;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const payload = (await response.json()) as
      | SecureTokenResponse
      | FirebaseErrorResponse;

    if (!response.ok) {
      const errorPayload = payload as FirebaseErrorResponse;
      const code = errorPayload.error?.message ?? 'UNKNOWN_ERROR';
      this.logger.warn(`Firebase refresh failed: ${code}`);
      throw this.mapFirebaseError(code);
    }

    const success = payload as SecureTokenResponse;
    return {
      idToken: success.id_token,
      refreshToken: success.refresh_token,
      expiresIn: Number(success.expires_in),
      firebaseUid: success.user_id,
    };
  }

  async sendEmailVerification(idToken: string): Promise<void> {
    const apiKey = this.getApiKey();
    const url = `${IDENTITY_TOOLKIT_BASE}:sendOobCode?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'VERIFY_EMAIL',
        idToken,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as FirebaseErrorResponse;
      const code = payload.error?.message ?? 'UNKNOWN_ERROR';
      this.logger.warn(`Firebase sendOobCode VERIFY_EMAIL failed: ${code}`);
      throw this.mapFirebaseError(code);
    }
  }

  async isEmailVerified(firebaseUid: string): Promise<boolean> {
    const user = await this.firebaseAdmin.auth().getUser(firebaseUid);
    return user.emailVerified;
  }

  async deleteUser(firebaseUid: string): Promise<void> {
    await this.firebaseAdmin.auth().deleteUser(firebaseUid);
  }

  async updatePassword(
    firebaseUid: string,
    newPassword: string,
  ): Promise<void> {
    try {
      await this.firebaseAdmin
        .auth()
        .updateUser(firebaseUid, { password: newPassword });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Firebase updatePassword failed: ${message}`);
      throw this.mapFirebaseError(message);
    }
  }

  async revokeRefreshTokens(firebaseUid: string): Promise<void> {
    await this.firebaseAdmin.auth().revokeRefreshTokens(firebaseUid);
  }

  async signInWithGoogle(
    googleIdToken: string,
  ): Promise<FirebaseGoogleSignInResult> {
    const apiKey = this.getApiKey();
    const url = `${IDENTITY_TOOLKIT_BASE}:signInWithIdp?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: `id_token=${googleIdToken}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnSecureToken: true,
        returnIdpCredential: true,
      }),
    });

    const payload = (await response.json()) as
      | SignInWithIdpResponse
      | FirebaseErrorResponse;

    if (!response.ok) {
      const errorPayload = payload as FirebaseErrorResponse;
      const code = errorPayload.error?.message ?? 'UNKNOWN_ERROR';
      this.logger.warn(`Firebase signInWithIdp failed: ${code}`);
      throw this.mapFirebaseError(code);
    }

    const success = payload as SignInWithIdpResponse;
    const { firstName, lastName } = this.splitDisplayName(
      success.firstName,
      success.lastName,
      success.fullName ?? success.displayName,
    );

    return {
      firebaseUid: success.localId,
      idToken: success.idToken,
      refreshToken: success.refreshToken,
      expiresIn: Number(success.expiresIn),
      email: success.email,
      emailVerified: success.emailVerified ?? true,
      firstName,
      lastName,
      avatarUrl: success.photoUrl ?? null,
    };
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const apiKey = this.getApiKey();
    const url = `${IDENTITY_TOOLKIT_BASE}:sendOobCode?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email,
      }),
    });

    if (response.ok) {
      return;
    }

    const payload = (await response.json()) as FirebaseErrorResponse;
    const code = payload.error?.message ?? 'UNKNOWN_ERROR';

    if (
      code.startsWith('EMAIL_NOT_FOUND') ||
      code.startsWith('USER_NOT_FOUND')
    ) {
      this.logger.warn(
        `Password reset requested for unknown email, returning success to avoid enumeration`,
      );
      return;
    }

    this.logger.warn(`Firebase sendOobCode PASSWORD_RESET failed: ${code}`);
    throw this.mapFirebaseError(code);
  }

  private async callIdentityToolkit(
    endpoint: 'signUp' | 'signInWithPassword',
    body: Record<string, unknown>,
    displayName?: string,
  ): Promise<FirebaseAuthResult> {
    const apiKey = this.getApiKey();
    const url = `${IDENTITY_TOOLKIT_BASE}:${endpoint}?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as
      | IdentityToolkitAuthResponse
      | FirebaseErrorResponse;

    if (!response.ok) {
      const errorPayload = payload as FirebaseErrorResponse;
      const code = errorPayload.error?.message ?? 'UNKNOWN_ERROR';
      this.logger.warn(`Firebase ${endpoint} failed: ${code}`);
      throw this.mapFirebaseError(code);
    }

    const success = payload as IdentityToolkitAuthResponse;

    if (endpoint === 'signUp' && displayName) {
      try {
        await this.firebaseAdmin
          .auth()
          .updateUser(success.localId, { displayName });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to set displayName: ${message}`);
      }
    }

    return {
      firebaseUid: success.localId,
      idToken: success.idToken,
      refreshToken: success.refreshToken,
      expiresIn: Number(success.expiresIn),
      email: success.email,
    };
  }

  private getApiKey(): string {
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      this.logger.error('FIREBASE_API_KEY env var no esta configurada');
      throw new InternalServerErrorException(
        'Servicio de autenticacion no disponible',
      );
    }
    return apiKey;
  }

  private splitDisplayName(
    firstName?: string,
    lastName?: string,
    fullName?: string,
  ): { firstName: string | null; lastName: string | null } {
    if (firstName || lastName) {
      return {
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
      };
    }

    const cleaned = fullName?.trim();
    if (!cleaned) {
      return { firstName: null, lastName: null };
    }

    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: null };
    }
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  private mapFirebaseError(code: string): Error {
    if (code.startsWith('EMAIL_EXISTS')) {
      return new ConflictException('El correo electronico ya esta registrado');
    }
    if (
      code.startsWith('INVALID_PASSWORD') ||
      code.startsWith('EMAIL_NOT_FOUND') ||
      code.startsWith('INVALID_LOGIN_CREDENTIALS') ||
      code.startsWith('INVALID_REFRESH_TOKEN') ||
      code.startsWith('TOKEN_EXPIRED') ||
      code.startsWith('USER_NOT_FOUND')
    ) {
      return new UnauthorizedException(
        'Correo electronico o contraseña invalidos',
      );
    }
    if (code.startsWith('USER_DISABLED')) {
      return new UnauthorizedException(
        'La cuenta de usuario esta deshabilitada',
      );
    }
    if (code.startsWith('TOO_MANY_ATTEMPTS')) {
      return new UnauthorizedException(
        'Demasiados intentos. Intenta de nuevo mas tarde',
      );
    }
    if (code.startsWith('WEAK_PASSWORD')) {
      return new ValidationException('Los datos enviados no son validos.', [
        {
          field: 'password',
          value: undefined,
          error: 'La contraseña es demasiado débil',
        },
      ]);
    }
    return new InternalServerErrorException(`Error de autenticacion: ${code}`);
  }
}
