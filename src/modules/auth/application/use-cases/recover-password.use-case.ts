import { Inject, Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import { withMinDuration } from '../../../../shared-kernel/utils/constant-time.util';
import type { IFirebaseAuthService } from '../../domain/interfaces/services/firebase-auth.service.interface';
import { FIREBASE_AUTH_SERVICE } from '../../domain/interfaces/services/firebase-auth.service.interface';
import { RecoverPasswordDto } from '../dtos/recover-password.dto';

const MIN_RESPONSE_TIME_MS = 600;

@Injectable()
export class RecoverPasswordUseCase implements UseCase<
  RecoverPasswordDto,
  void
> {
  private readonly logger = new Logger(RecoverPasswordUseCase.name);

  constructor(
    @Inject(FIREBASE_AUTH_SERVICE)
    private readonly firebaseAuth: IFirebaseAuthService,
  ) {}

  execute(dto: RecoverPasswordDto): Promise<void> {
    return withMinDuration(() => this.run(dto), MIN_RESPONSE_TIME_MS);
  }

  private async run(dto: RecoverPasswordDto): Promise<void> {
    try {
      await this.firebaseAuth.sendPasswordResetEmail(dto.email);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Password reset email dispatch failed for ${dto.email}: ${message}`,
      );
    }
  }
}
