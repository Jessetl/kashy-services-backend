import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import { FIREBASE_ADMIN } from '../../../../shared-kernel/infrastructure/firebase/firebase-admin.provider';
import { UnauthorizedException } from '../../../../shared-kernel/domain/exceptions/unauthorized.exception';
import { ExternalServiceException } from '../../../../shared-kernel/domain/exceptions/external-service.exception';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface';
import { ChangePasswordDto } from '../dtos/change-password.dto';

interface FirebaseSignInResponse {
  idToken: string;
}

interface FirebaseErrorResponse {
  error: { message: string };
}

interface Input {
  firebaseUid: string;
  dto: ChangePasswordDto;
}

@Injectable()
export class ChangePasswordUseCase implements UseCase<Input, void> {
  private readonly logger = new Logger(ChangePasswordUseCase.name);
  private readonly apiKey: string;
  private readonly authUrl: string;
  private readonly timeoutMs = 10_000;

  constructor(
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(FIREBASE_ADMIN) private readonly firebaseAdmin: typeof admin,
  ) {
    this.apiKey = this.configService.get<string>('FIREBASE_API_KEY', '');
    this.authUrl = this.configService.get<string>('FIREBASE_AUTH_URL', '');
  }

  async execute({ firebaseUid, dto }: Input): Promise<void> {
    const user = await this.userRepository.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verificar contraseña actual intentando hacer sign-in con ella
    await this.verifyCurrentPassword(user.email, dto.currentPassword);

    // Actualizar contraseña en Firebase
    try {
      await this.firebaseAdmin.auth().updateUser(firebaseUid, {
        password: dto.newPassword,
      });
      this.logger.log(`Password updated for uid: ${firebaseUid}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update password';
      this.logger.error(`Failed to update password in Firebase: ${msg}`);
      throw new ExternalServiceException('Firebase Auth', msg);
    }
  }

  private async verifyCurrentPassword(email: string, password: string): Promise<void> {
    const url = `${this.authUrl}/accounts:signInWithPassword?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ExternalServiceException('Firebase Auth', `Request timed out after ${this.timeoutMs}ms`);
      }
      throw new ExternalServiceException(
        'Firebase Auth',
        error instanceof Error ? error.message : 'Connection failed',
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as FirebaseErrorResponse | null;
      const firebaseCode = body?.error?.message ?? 'UNKNOWN';
      this.logger.warn(`verifyCurrentPassword failed — Firebase code: ${firebaseCode}`);

      const invalidCodes = [
        'EMAIL_NOT_FOUND',
        'INVALID_PASSWORD',
        'INVALID_LOGIN_CREDENTIALS',
        'USER_DISABLED',
        'TOO_MANY_ATTEMPTS_TRY_LATER',
      ];

      if (invalidCodes.includes(firebaseCode)) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      throw new ExternalServiceException('Firebase Auth', `Unexpected error: ${firebaseCode}`);
    }
  }
}
