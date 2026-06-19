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
import { LoginUserUseCase } from './login-user.use-case';

describe('LoginUserUseCase', () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let deviceRepository: jest.Mocked<IUserDeviceRepository>;
  let firebaseAuth: jest.Mocked<IFirebaseAuthService>;
  let jwtTokenService: jest.Mocked<JwtTokenService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let useCase: LoginUserUseCase;

  const device = {
    deviceId: 'dev-1',
    deviceName: 'Pixel',
    platform: 'android',
    appVersion: '1.0.0',
    fcmToken: null,
  };

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      findByFirebaseUid: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as never;
    deviceRepository = {
      findByDeviceId: jest.fn(),
      findByUserIdAndDeviceId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as never;
    firebaseAuth = {
      signIn: jest.fn(),
      isEmailVerified: jest.fn(),
    } as never;
    jwtTokenService = {
      signFor: jest.fn(),
    } as never;
    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([] as never),
    } as never;

    useCase = new LoginUserUseCase(
      userRepository,
      deviceRepository,
      firebaseAuth,
      jwtTokenService,
      eventEmitter,
    );

    firebaseAuth.signIn.mockResolvedValue({
      firebaseUid: 'fb-uid',
      idToken: 'id-tok',
      refreshToken: 'rt-plain',
      expiresIn: 3600,
      email: 'jane@kashy.app',
    });
    firebaseAuth.isEmailVerified.mockResolvedValue(true);
    jwtTokenService.signFor.mockResolvedValue({
      accessToken: 'jwt',
      expiresIn: 900,
    });
    deviceRepository.findByDeviceId.mockResolvedValue(null);
    deviceRepository.save.mockImplementation(async (d) => d);
    userRepository.save.mockImplementation(async (u: User) => u);
  });

  it('lanza EmailNotVerifiedException si email no verificado', async () => {
    firebaseAuth.isEmailVerified.mockResolvedValue(false);

    await expect(
      useCase.execute({
        dto: { email: 'a@b.com', password: 'p' } as never,
        device,
      }),
    ).rejects.toBeInstanceOf(EmailNotVerifiedException);
  });

  it('reutiliza user existente cuando firebaseUid match', async () => {
    const existing = User.create('u-1', 'fb-uid', 'jane@kashy.app', 'VE');
    userRepository.findByFirebaseUid.mockResolvedValue(existing);

    const result = await useCase.execute({
      dto: { email: 'jane@kashy.app', password: 'p' } as never,
      device,
    });

    expect(userRepository.save).not.toHaveBeenCalled();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    expect(deviceRepository.save).toHaveBeenCalled();
    expect(result.accessToken).toBe('jwt');
  });

  it('crea user y emite USER_REGISTERED cuando firebaseUid no existe', async () => {
    userRepository.findByFirebaseUid.mockResolvedValue(null);

    await useCase.execute({
      dto: { email: 'jane@kashy.app', password: 'p' } as never,
      device,
    });

    expect(userRepository.save).toHaveBeenCalled();
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      USER_REGISTERED,
      expect.objectContaining({ userId: expect.any(String) }),
    );
  });

  it('respeta tiempo minimo de respuesta en happy path', async () => {
    const existing = User.create('u-1', 'fb-uid', 'jane@kashy.app', 'VE');
    userRepository.findByFirebaseUid.mockResolvedValue(existing);

    const start = Date.now();
    await useCase.execute({
      dto: { email: 'jane@kashy.app', password: 'p' } as never,
      device,
    });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(795);
  });

  it('respeta tiempo minimo de respuesta en error de credenciales', async () => {
    firebaseAuth.signIn.mockRejectedValueOnce(new Error('INVALID_PASSWORD'));

    const start = Date.now();
    await expect(
      useCase.execute({
        dto: { email: 'a@b.com', password: 'wrong' } as never,
        device,
      }),
    ).rejects.toThrow();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(795);
  });
});
