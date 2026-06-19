import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import { withMinDuration } from '../../../../shared-kernel/utils/constant-time.util';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface';
import type { IUserDeviceRepository } from '../../domain/interfaces/repositories/user-device.repository.interface';
import { USER_DEVICE_REPOSITORY } from '../../domain/interfaces/repositories/user-device.repository.interface';
import type { IFirebaseAuthService } from '../../domain/interfaces/services/firebase-auth.service.interface';
import { FIREBASE_AUTH_SERVICE } from '../../domain/interfaces/services/firebase-auth.service.interface';
import { UserDevice } from '../../domain/entities/user-device.entity';
import { EmailNotVerifiedException } from '../../domain/exceptions/email-not-verified.exception';
import { LoginUserDto } from '../dtos/login-user.dto';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { UserMapper } from '../mappers/user.mapper';
import { JwtTokenService } from '../services/jwt-token.service';
import { DeviceInfo } from '../../infrastructure/decorators/device-info.decorator';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';

interface LoginUserInput {
  dto: LoginUserDto;
  device: DeviceInfo;
}

const MIN_RESPONSE_TIME_MS = 800;

@Injectable()
export class LoginUserUseCase implements UseCase<
  LoginUserInput,
  AuthResponseDto
> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(USER_DEVICE_REPOSITORY)
    private readonly deviceRepository: IUserDeviceRepository,
    @Inject(FIREBASE_AUTH_SERVICE)
    private readonly firebaseAuth: IFirebaseAuthService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  execute(input: LoginUserInput): Promise<AuthResponseDto> {
    return withMinDuration(() => this.run(input), MIN_RESPONSE_TIME_MS);
  }

  private async run(input: LoginUserInput): Promise<AuthResponseDto> {
    const { dto, device } = input;

    const firebaseResult = await this.firebaseAuth.signIn({
      email: dto.email,
      password: dto.password,
    });

    const emailVerified = await this.firebaseAuth.isEmailVerified(
      firebaseResult.firebaseUid,
    );
    if (!emailVerified) {
      throw new EmailNotVerifiedException();
    }

    const user = await this.userRepository.findByFirebaseUid(
      firebaseResult.firebaseUid,
    );
    if (!user) {
      throw new UserNotFoundException(dto.email);
    }

    await this.upsertDevice(user.id, device);

    const signed = await this.jwtTokenService.signFor(
      user,
      firebaseResult.expiresIn,
    );

    return {
      accessToken: signed.accessToken,
      refreshToken: firebaseResult.refreshToken,
      expiresIn: signed.expiresIn,
      user: UserMapper.toResponse(user),
    };
  }

  private async upsertDevice(
    userId: string,
    device: DeviceInfo,
  ): Promise<void> {
    const existing = await this.deviceRepository.findByDeviceId(
      device.deviceId,
    );

    if (existing && existing.userId === userId) {
      const reassigned = existing.refresh(
        userId,
        device.deviceName,
        device.platform,
        device.appVersion,
        device.fcmToken,
      );
      await this.deviceRepository.save(reassigned);
      return;
    }

    if (existing) {
      await this.deviceRepository.delete(existing.id);
    }

    const newDevice = UserDevice.create(
      randomUUID(),
      userId,
      device.deviceId,
      device.deviceName,
      device.platform,
      device.appVersion,
      device.fcmToken,
    );

    await this.deviceRepository.save(newDevice);
  }
}
