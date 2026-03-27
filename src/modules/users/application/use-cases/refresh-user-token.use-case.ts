import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { UseCase } from '../../../../shared-kernel/application/use-case.js';
import { UnauthorizedException } from '../../../../shared-kernel/domain/exceptions/unauthorized.exception.js';
import { ExternalServiceException } from '../../../../shared-kernel/domain/exceptions/external-service.exception.js';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface.js';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface.js';
import { User } from '../../domain/entities/user.entity.js';
import { RefreshTokenDto } from '../dtos/refresh-token.dto.js';
import { LoginResponseDto } from '../dtos/login-response.dto.js';
import { UserMapper } from '../mappers/user.mapper.js';

interface FirebaseRefreshResponse {
  id_token: string;
  refresh_token: string;
  expires_in: string;
  token_type: 'Bearer';
  user_id: string;
  project_id: string;
}

interface FirebaseRefreshErrorResponse {
  error?: {
    message?: string;
  };
}

interface FirebaseIdTokenPayload {
  email?: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class RefreshUserTokenUseCase implements UseCase<
  RefreshTokenDto,
  LoginResponseDto
> {
  private readonly apiKey: string;
  private readonly secureTokenUrl: string;
  private readonly timeoutMs = 10000;

  constructor(
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {
    this.apiKey = this.configService.get<string>('FIREBASE_API_KEY', '');
    this.secureTokenUrl = this.configService.get<string>(
      'FIREBASE_SECURE_TOKEN_URL',
      'https://securetoken.googleapis.com/v1/token',
    );
  }

  async execute(input: RefreshTokenDto): Promise<LoginResponseDto> {
    const url = `${this.secureTokenUrl}?key=${this.apiKey}`;

    let response: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: input.refreshToken,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ExternalServiceException(
          'Firebase Secure Token',
          `Request timed out after ${this.timeoutMs}ms`,
        );
      }
      throw new ExternalServiceException(
        'Firebase Secure Token',
        error instanceof Error ? error.message : 'Connection failed',
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => null)) as FirebaseRefreshErrorResponse | null;
      const firebaseMessage = body?.error?.message;

      if (firebaseMessage === 'TOKEN_EXPIRED') {
        throw new UnauthorizedException('Refresh token expired');
      }
      if (firebaseMessage === 'INVALID_REFRESH_TOKEN') {
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (firebaseMessage === 'USER_DISABLED') {
        throw new UnauthorizedException('This account has been disabled');
      }

      throw new UnauthorizedException('Invalid refresh token');
    }

    const data = (await response.json()) as FirebaseRefreshResponse;

    let user = await this.userRepository.findByFirebaseUid(data.user_id);

    if (!user) {
      const payload = this.decodeJwtPayload(data.id_token);
      const email = payload?.email;

      if (email) {
        const [firstName, ...lastNameParts] = (payload?.name || '')
          .trim()
          .split(/\s+/);

        user = await this.userRepository.save(
          User.create(randomUUID(), data.user_id, email, {
            firstName: firstName || undefined,
            lastName:
              lastNameParts.length > 0 ? lastNameParts.join(' ') : undefined,
            avatarUrl: payload?.picture,
          }),
        );
      }
    }

    const dto = new LoginResponseDto();
    dto.idToken = data.id_token;
    dto.refreshToken = data.refresh_token;
    dto.expiresIn = data.expires_in;
    if (user) {
      dto.user = UserMapper.toResponse(user);
    }
    return dto;
  }

  private decodeJwtPayload(token: string): FirebaseIdTokenPayload | null {
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) {
      return null;
    }

    try {
      const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
      return JSON.parse(payload) as FirebaseIdTokenPayload;
    } catch {
      return null;
    }
  }
}
