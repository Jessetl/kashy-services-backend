process.env.APP_ENCRYPTION_KEY ??=
  'a2tra2tra2tra2tra2tra2tra2tra2tra2tra2tra2s=';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import type { IUserDeviceRepository } from '../../domain/interfaces/repositories/user-device.repository.interface';
import type { IFirebaseAuthService } from '../../domain/interfaces/services/firebase-auth.service.interface';
import { USER_REGISTERED } from '../../../../shared-kernel/domain/events/user.events';
import { User } from '../../domain/entities/user.entity';
import { EmailNotVerifiedException } from '../../domain/exceptions/email-not-verified.exception';
import { JwtTokenService } from '../services/jwt-token.service';
import { LoginWithGoogleUseCase } from './login-with-google.use-case';

describe('LoginWithGoogleUseCase', () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let deviceRepository: jest.Mocked<IUserDeviceRepository>;
  let firebaseAuth: jest.Mocked<IFirebaseAuthService>;
  let jwtTokenService: jest.Mocked<JwtTokenService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let useCase: LoginWithGoogleUseCase;

  const device = {
    deviceId: 'dev-1',
    deviceName: 'Pixel',
    platform: 'android',
    appVersion: '1.0.0',
    fcmToken: null,
  };

  beforeEach(() => {
    userRepository = {
      findByFirebaseUid: jest.fn(),
      save: jest.fn(),
    } as never;
    deviceRepository = {
      findByDeviceId: jest.fn(),
      save: jest.fn(),
    } as never;
    firebaseAuth = { signInWithGoogle: jest.fn() } as never;
    jwtTokenService = { signFor: jest.fn() } as never;
    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([] as never),
    } as never;

    useCase = new LoginWithGoogleUseCase(
      userRepository,
      deviceRepository,
      firebaseAuth,
      jwtTokenService,
      eventEmitter,
    );

    firebaseAuth.signInWithGoogle.mockResolvedValue({
      firebaseUid: 'fb-uid',
      idToken: 'id',
      refreshToken: 'rt',
      expiresIn: 3600,
      email: 'jane@kashy.app',
      emailVerified: true,
      firstName: 'Jane',
      lastName: 'Doe',
      avatarUrl: 'https://photo',
    });
    jwtTokenService.signFor.mockResolvedValue({
      accessToken: 'jwt',
      expiresIn: 900,
    });
    deviceRepository.findByDeviceId.mockResolvedValue(null);
    deviceRepository.save.mockImplementation(async (d) => d);
    userRepository.save.mockImplementation(async (u: User) => u);
  });

  it('lanza EmailNotVerifiedException si Google no verifica email', async () => {
    firebaseAuth.signInWithGoogle.mockResolvedValueOnce({
      firebaseUid: 'fb-uid',
      idToken: 'id',
      refreshToken: 'rt',
      expiresIn: 3600,
      email: 'jane@kashy.app',
      emailVerified: false,
      firstName: 'Jane',
      lastName: 'Doe',
      avatarUrl: null,
    });

    await expect(
      useCase.execute({
        dto: { googleIdToken: 'gid' } as never,
        device,
      }),
    ).rejects.toBeInstanceOf(EmailNotVerifiedException);

    expect(deviceRepository.save).not.toHaveBeenCalled();
  });

  it('auto-crea user con perfil de Google y emite USER_REGISTERED', async () => {
    userRepository.findByFirebaseUid.mockResolvedValue(null);

    const result = await useCase.execute({
      dto: { googleIdToken: 'gid' } as never,
      device,
    });

    expect(userRepository.save).toHaveBeenCalled();
    const savedUser = userRepository.save.mock.calls[0][0];
    expect(savedUser.email).toBe('jane@kashy.app');
    expect(savedUser.firstName).toBe('Jane');
    expect(savedUser.lastName).toBe('Doe');
    expect(savedUser.avatarUrl).toBe('https://photo');
    expect(savedUser.countryCode).toBe('VE');
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      USER_REGISTERED,
      expect.objectContaining({ userId: expect.any(String) }),
    );
    expect(result.accessToken).toBe('jwt');
  });

  it('reutiliza user existente sin emitir USER_REGISTERED', async () => {
    const existing = User.create('u-1', 'fb-uid', 'jane@kashy.app', 'VE');
    userRepository.findByFirebaseUid.mockResolvedValue(existing);

    await useCase.execute({
      dto: { googleIdToken: 'gid' } as never,
      device,
    });

    expect(userRepository.save).not.toHaveBeenCalled();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    expect(deviceRepository.save).toHaveBeenCalled();
  });
});
