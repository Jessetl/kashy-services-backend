import { Inject, Injectable, Logger } from '@nestjs/common';
import { UnauthorizedException } from '../../../../shared-kernel/domain/exceptions/unauthorized.exception';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface';
import type { IUserDeviceRepository } from '../../domain/interfaces/repositories/user-device.repository.interface';
import { USER_DEVICE_REPOSITORY } from '../../domain/interfaces/repositories/user-device.repository.interface';
import type {
  FirebaseRefreshResult,
  IFirebaseAuthService,
} from '../../domain/interfaces/services/firebase-auth.service.interface';
import { FIREBASE_AUTH_SERVICE } from '../../domain/interfaces/services/firebase-auth.service.interface';
import { RefreshResponseDto } from '../dtos/refresh-response.dto';
import { JwtTokenService } from '../services/jwt-token.service';

interface RefreshTokenInput {
  refreshToken: string;
  deviceId: string;
}

@Injectable()
export class RefreshTokenUseCase implements UseCase<
  RefreshTokenInput,
  RefreshResponseDto
> {
  private readonly logger = new Logger(RefreshTokenUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(USER_DEVICE_REPOSITORY)
    private readonly deviceRepository: IUserDeviceRepository,
    @Inject(FIREBASE_AUTH_SERVICE)
    private readonly firebaseAuth: IFirebaseAuthService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshResponseDto> {
    const { refreshToken, deviceId } = input;

    let firebaseResult: FirebaseRefreshResult;
    try {
      firebaseResult = await this.firebaseAuth.refreshIdToken(refreshToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Firebase refreshIdToken failed: ${message}`);
      throw new UnauthorizedException('Refresh token invalido o revocado');
    }

    const user = await this.userRepository.findByFirebaseUid(
      firebaseResult.firebaseUid,
    );
    if (!user) {
      throw new UnauthorizedException('El usuario ya no existe');
    }

    const device = await this.deviceRepository.findByDeviceId(deviceId);
    if (!device) {
      throw new UnauthorizedException('Sesion de dispositivo no encontrada');
    }

    if (device.userId !== user.id) {
      this.logger.warn(
        `Refresh device binding mismatch: device.userId=${device.userId} vs user.id=${user.id}`,
      );
      throw new UnauthorizedException('Sesion de dispositivo no autorizada');
    }

    const touched = device.touch();
    await this.deviceRepository.save(touched);

    const signed = await this.jwtTokenService.signFor(
      user,
      firebaseResult.expiresIn,
    );

    return {
      accessToken: signed.accessToken,
      refreshToken: firebaseResult.refreshToken,
      expiresIn: signed.expiresIn,
    };
  }
}
