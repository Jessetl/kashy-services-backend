import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import type { IUserDeviceRepository } from '../../domain/interfaces/repositories/user-device.repository.interface';
import type { IFirebaseAuthService } from '../../domain/interfaces/services/firebase-auth.service.interface';
import { UnauthorizedException } from '../../../../shared-kernel/domain/exceptions/unauthorized.exception';
import { User } from '../../domain/entities/user.entity';
import { UserDevice } from '../../domain/entities/user-device.entity';
import { JwtTokenService } from '../services/jwt-token.service';
import { RefreshTokenUseCase } from './refresh-token.use-case';

describe('RefreshTokenUseCase', () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let deviceRepository: jest.Mocked<IUserDeviceRepository>;
  let firebaseAuth: jest.Mocked<IFirebaseAuthService>;
  let jwtTokenService: jest.Mocked<JwtTokenService>;
  let useCase: RefreshTokenUseCase;

  const input = { refreshToken: 'rt-plain', deviceId: 'dev-1' };

  beforeEach(() => {
    userRepository = { findByFirebaseUid: jest.fn() } as never;
    deviceRepository = {
      findByDeviceId: jest.fn(),
      save: jest.fn(),
    } as never;
    firebaseAuth = { refreshIdToken: jest.fn() } as never;
    jwtTokenService = {
      signFor: jest.fn(),
    } as never;

    useCase = new RefreshTokenUseCase(
      userRepository,
      deviceRepository,
      firebaseAuth,
      jwtTokenService,
    );

    jwtTokenService.signFor.mockResolvedValue({
      accessToken: 'jwt',
      expiresIn: 900,
    });
    deviceRepository.save.mockImplementation(async (d) => d);
  });

  it('lanza unauthorized si Firebase rechaza el refresh', async () => {
    firebaseAuth.refreshIdToken.mockRejectedValueOnce(
      new Error('TOKEN_EXPIRED'),
    );

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(deviceRepository.findByDeviceId).not.toHaveBeenCalled();
  });

  it('lanza unauthorized si user no existe en BD', async () => {
    firebaseAuth.refreshIdToken.mockResolvedValue({
      idToken: 'new-id',
      refreshToken: 'rt-plain',
      expiresIn: 3600,
      firebaseUid: 'fb-uid',
    });
    userRepository.findByFirebaseUid.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(deviceRepository.findByDeviceId).not.toHaveBeenCalled();
  });

  it('lanza unauthorized si device no existe', async () => {
    firebaseAuth.refreshIdToken.mockResolvedValue({
      idToken: 'new-id',
      refreshToken: 'rt-plain',
      expiresIn: 3600,
      firebaseUid: 'fb-uid',
    });
    userRepository.findByFirebaseUid.mockResolvedValue(
      User.create('u-1', 'fb-uid', 'a@b.com', 'VE'),
    );
    deviceRepository.findByDeviceId.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('lanza unauthorized si device.userId no coincide con user.id', async () => {
    firebaseAuth.refreshIdToken.mockResolvedValue({
      idToken: 'new-id',
      refreshToken: 'rt-plain',
      expiresIn: 3600,
      firebaseUid: 'fb-uid',
    });
    userRepository.findByFirebaseUid.mockResolvedValue(
      User.create('u-1', 'fb-uid', 'a@b.com', 'VE'),
    );
    deviceRepository.findByDeviceId.mockResolvedValue(
      UserDevice.create('d-1', 'u-OTRO', 'dev-1', 'Pixel', 'android'),
    );

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(deviceRepository.save).not.toHaveBeenCalled();
  });

  it('happy path: actualiza last_active, firma JWT y devuelve refresh de Firebase', async () => {
    firebaseAuth.refreshIdToken.mockResolvedValue({
      idToken: 'new-id',
      refreshToken: 'rt-rotated',
      expiresIn: 3600,
      firebaseUid: 'fb-uid',
    });
    userRepository.findByFirebaseUid.mockResolvedValue(
      User.create('u-1', 'fb-uid', 'a@b.com', 'VE'),
    );
    deviceRepository.findByDeviceId.mockResolvedValue(
      UserDevice.create('d-1', 'u-1', 'dev-1', 'Pixel', 'android'),
    );

    const result = await useCase.execute(input);

    expect(deviceRepository.save).toHaveBeenCalled();
    expect(result.accessToken).toBe('jwt');
    expect(result.refreshToken).toBe('rt-rotated');
    expect(result.expiresIn).toBe(900);
  });

  it('devuelve mismo refresh si Firebase no rota', async () => {
    firebaseAuth.refreshIdToken.mockResolvedValue({
      idToken: 'new-id',
      refreshToken: 'rt-plain',
      expiresIn: 3600,
      firebaseUid: 'fb-uid',
    });
    userRepository.findByFirebaseUid.mockResolvedValue(
      User.create('u-1', 'fb-uid', 'a@b.com', 'VE'),
    );
    deviceRepository.findByDeviceId.mockResolvedValue(
      UserDevice.create('d-1', 'u-1', 'dev-1', 'Pixel', 'android'),
    );

    const result = await useCase.execute(input);

    expect(result.refreshToken).toBe('rt-plain');
  });
});
