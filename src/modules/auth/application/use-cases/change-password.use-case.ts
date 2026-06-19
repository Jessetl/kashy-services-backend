import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface';
import type { IUserDeviceRepository } from '../../domain/interfaces/repositories/user-device.repository.interface';
import { USER_DEVICE_REPOSITORY } from '../../domain/interfaces/repositories/user-device.repository.interface';
import type { IFirebaseAuthService } from '../../domain/interfaces/services/firebase-auth.service.interface';
import { FIREBASE_AUTH_SERVICE } from '../../domain/interfaces/services/firebase-auth.service.interface';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import { ChangePasswordDto } from '../dtos/change-password.dto';

interface ChangePasswordInput {
  userId: string;
  dto: ChangePasswordDto;
}

@Injectable()
export class ChangePasswordUseCase implements UseCase<
  ChangePasswordInput,
  void
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(USER_DEVICE_REPOSITORY)
    private readonly deviceRepository: IUserDeviceRepository,
    @Inject(FIREBASE_AUTH_SERVICE)
    private readonly firebaseAuth: IFirebaseAuthService,
  ) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    const { userId, dto } = input;

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(userId);
    }

    await this.firebaseAuth.signIn({
      email: user.email,
      password: dto.currentPassword,
    });

    await this.firebaseAuth.updatePassword(user.firebaseUid, dto.newPassword);

    await this.firebaseAuth.revokeRefreshTokens(user.firebaseUid);

    await this.deviceRepository.deleteByUserId(user.id);
  }
}
