import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import { withMinDuration } from '../../../../shared-kernel/utils/constant-time.util';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface';
import type { IUserDeviceRepository } from '../../domain/interfaces/repositories/user-device.repository.interface';
import { USER_DEVICE_REPOSITORY } from '../../domain/interfaces/repositories/user-device.repository.interface';
import {
  USER_REGISTERED,
  UserRegisteredEvent,
} from '../../../../shared-kernel/domain/events/user.events';
import type { IFirebaseAuthService } from '../../domain/interfaces/services/firebase-auth.service.interface';
import { FIREBASE_AUTH_SERVICE } from '../../domain/interfaces/services/firebase-auth.service.interface';
import type { FirebaseGoogleSignInResult } from '../../domain/interfaces/services/firebase-auth.service.interface';
import { User } from '../../domain/entities/user.entity';
import { UserDevice } from '../../domain/entities/user-device.entity';
import { EmailNotVerifiedException } from '../../domain/exceptions/email-not-verified.exception';
import { LoginGoogleDto } from '../dtos/login-google.dto';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { UserMapper } from '../mappers/user.mapper';
import { JwtTokenService } from '../services/jwt-token.service';
import { DeviceInfo } from '../../infrastructure/decorators/device-info.decorator';

interface LoginWithGoogleInput {
  dto: LoginGoogleDto;
  device: DeviceInfo;
}

const MIN_RESPONSE_TIME_MS = 800;

@Injectable()
export class LoginWithGoogleUseCase implements UseCase<
  LoginWithGoogleInput,
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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  execute(input: LoginWithGoogleInput): Promise<AuthResponseDto> {
    return withMinDuration(() => this.run(input), MIN_RESPONSE_TIME_MS);
  }

  private async run(input: LoginWithGoogleInput): Promise<AuthResponseDto> {
    const { dto, device } = input;

    const firebaseResult = await this.firebaseAuth.signInWithGoogle(
      dto.googleIdToken,
    );

    if (!firebaseResult.emailVerified) {
      throw new EmailNotVerifiedException();
    }

    const user = await this.findOrCreateUser(firebaseResult);

    await this.upsertDevice(user.id, device);

    const signed = await this.jwtTokenService.signFor(user);

    return {
      accessToken: signed.accessToken,
      refreshToken: firebaseResult.refreshToken,
      expiresIn: signed.expiresIn,
      user: UserMapper.toResponse(user),
    };
  }

  private async findOrCreateUser(
    fb: FirebaseGoogleSignInResult,
  ): Promise<User> {
    const existing = await this.userRepository.findByFirebaseUid(
      fb.firebaseUid,
    );
    if (existing) return existing;

    // Auto-registro Google: el body no trae country_code. Default 'VE'
    // (mercado primario MVP); el usuario lo actualiza vía PATCH /auth/profile.
    // Ver authentication.md.
    const user = User.create(
      randomUUID(),
      fb.firebaseUid,
      fb.email,
      'VE',
      fb.firstName,
      fb.lastName,
      fb.avatarUrl,
    );
    const saved = await this.userRepository.save(user);

    await this.eventEmitter.emitAsync(
      USER_REGISTERED,
      new UserRegisteredEvent(saved.id),
    );

    return saved;
  }

  private async upsertDevice(
    userId: string,
    device: DeviceInfo,
  ): Promise<void> {
    const existing = await this.deviceRepository.findByDeviceId(
      device.deviceId,
    );

    if (existing && existing.userId === userId) {
      const reassigned = existing.reassignToUser(
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
