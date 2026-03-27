import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { UseCase } from '../../../../shared-kernel/application/use-case.js';
import { UnauthorizedException } from '../../../../shared-kernel/domain/exceptions/unauthorized.exception.js';
import { ExternalServiceException } from '../../../../shared-kernel/domain/exceptions/external-service.exception.js';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface.js';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface.js';
import { User } from '../../domain/entities/user.entity.js';
import { LoginUserDto } from '../dtos/login-user.dto.js';
import { LoginResponseDto } from '../dtos/login-response.dto.js';
import { UserMapper } from '../mappers/user.mapper.js';

interface FirebaseSignInResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
}

interface FirebaseErrorResponse {
  error: { message: string };
}

@Injectable()
export class LoginUserUseCase implements UseCase<
  LoginUserDto,
  LoginResponseDto
> {
  private readonly apiKey: string;
  private readonly authUrl: string;
  private readonly timeoutMs = 10000;

  constructor(
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {
    this.apiKey = this.configService.get<string>('FIREBASE_API_KEY', '');
    this.authUrl = this.configService.get<string>('FIREBASE_AUTH_URL', '');
  }

  async execute(input: LoginUserDto): Promise<LoginResponseDto> {
    const url = `${this.authUrl}/accounts:signInWithPassword?key=${this.apiKey}`;

    // Try-catch alrededor de fetch — puede fallar por red, DNS, o timeout
    let response: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          returnSecureToken: true,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ExternalServiceException(
          'Firebase Auth',
          `Request timed out after ${this.timeoutMs}ms`,
        );
      }
      throw new ExternalServiceException(
        'Firebase Auth',
        error instanceof Error ? error.message : 'Connection failed',
      );
    } finally {
      clearTimeout(timeout);
    }

    // Respuesta HTTP recibida pero con error — extraer mensaje especifico de Firebase
    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => null)) as FirebaseErrorResponse | null;
      const firebaseMessage = body?.error?.message;

      if (
        firebaseMessage === 'EMAIL_NOT_FOUND' ||
        firebaseMessage === 'INVALID_PASSWORD'
      ) {
        throw new UnauthorizedException('Invalid email or password');
      }
      if (firebaseMessage === 'USER_DISABLED') {
        throw new UnauthorizedException('This account has been disabled');
      }

      throw new UnauthorizedException('Invalid email or password');
    }

    const data = (await response.json()) as FirebaseSignInResponse;

    let user = await this.userRepository.findByFirebaseUid(data.localId);
    if (!user) {
      const [firstName, ...lastNameParts] = (data.displayName || '')
        .trim()
        .split(/\s+/);

      const parsedFirstName = firstName || undefined;
      const parsedLastName =
        lastNameParts.length > 0 ? lastNameParts.join(' ') : undefined;

      user = await this.userRepository.save(
        User.create(randomUUID(), data.localId, data.email ?? input.email, {
          firstName: parsedFirstName,
          lastName: parsedLastName,
          avatarUrl: data.photoUrl,
        }),
      );
    }

    const dto = new LoginResponseDto();
    dto.idToken = data.idToken;
    dto.refreshToken = data.refreshToken;
    dto.expiresIn = data.expiresIn;
    dto.user = UserMapper.toResponse(user);
    return dto;
  }
}
