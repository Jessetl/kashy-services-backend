import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import { UnauthorizedException } from '../../../../shared-kernel/domain/exceptions/unauthorized.exception';
import { ExternalServiceException } from '../../../../shared-kernel/domain/exceptions/external-service.exception';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { LoginResponseDto } from '../dtos/login-response.dto';
import { UserMapper } from '../mappers/user.mapper';

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

    const user = await this.userRepository.findByFirebaseUid(data.user_id);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const dto = new LoginResponseDto();
    dto.idToken = data.id_token;
    dto.refreshToken = data.refresh_token;
    dto.expiresIn = data.expires_in;
    dto.user = UserMapper.toResponse(user);
    return dto;
  }
}
