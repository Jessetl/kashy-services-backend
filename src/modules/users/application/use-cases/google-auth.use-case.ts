import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import { FIREBASE_ADMIN } from '../../../../shared-kernel/infrastructure/firebase/firebase-admin.provider';
import { UnauthorizedException } from '../../../../shared-kernel/domain/exceptions/unauthorized.exception';
import { ExternalServiceException } from '../../../../shared-kernel/domain/exceptions/external-service.exception';
import { ConflictException } from '../../../../shared-kernel/domain/exceptions/conflict.exception';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface';
import type { INotificationPreferencesRepository } from '../../domain/interfaces/repositories/notification-preferences.repository.interface';
import { NOTIFICATION_PREFERENCES_REPOSITORY } from '../../domain/interfaces/repositories/notification-preferences.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { NotificationPreferences } from '../../domain/entities/notification-preferences.entity';
import { GoogleAuthDto } from '../dtos/google-auth.dto';
import { LoginResponseDto } from '../dtos/login-response.dto';
import { UserMapper } from '../mappers/user.mapper';

interface FirebaseCustomTokenResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
}

@Injectable()
export class GoogleAuthUseCase implements UseCase<
  GoogleAuthDto,
  LoginResponseDto
> {
  private readonly apiKey: string;
  private readonly authUrl: string;
  private readonly timeoutMs = 10000;

  constructor(
    private readonly configService: ConfigService,
    @Inject(FIREBASE_ADMIN) private readonly firebaseAdmin: typeof admin,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(NOTIFICATION_PREFERENCES_REPOSITORY)
    private readonly prefsRepository: INotificationPreferencesRepository,
  ) {
    this.apiKey = this.configService.get<string>('FIREBASE_API_KEY', '');
    this.authUrl = this.configService.get<string>('FIREBASE_AUTH_URL', '');
  }

  async execute(input: GoogleAuthDto): Promise<LoginResponseDto> {
    // Step 1: Verify the Firebase ID token issued after Google Sign-In on the client
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await this.firebaseAdmin
        .auth()
        .verifyIdToken(input.idToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired Google ID token');
    }

    const { uid, email, picture } = decodedToken;

    if (!email) {
      throw new UnauthorizedException(
        'Google account does not provide an email address',
      );
    }

    // Step 2: Find existing user or create a new one
    const user = await this.findOrCreateUser({
      uid,
      email,
      displayName: 'Anonymous',
      photoURL: picture,
      country: input.country,
      locationLatitude: input.locationLatitude,
      locationLongitude: input.locationLongitude,
    });

    // Step 3: Create a Firebase custom token and exchange it for idToken + refreshToken
    // so the client receives a full token pair regardless of which auth provider was used
    let customToken: string;
    try {
      customToken = await this.firebaseAdmin.auth().createCustomToken(uid);
    } catch (error) {
      throw new ExternalServiceException(
        'Firebase Auth',
        error instanceof Error
          ? error.message
          : 'Failed to create custom token',
      );
    }

    const tokens = await this.exchangeCustomToken(customToken);

    const dto = new LoginResponseDto();
    dto.idToken = tokens.idToken;
    dto.refreshToken = tokens.refreshToken;
    dto.expiresIn = tokens.expiresIn;
    dto.user = UserMapper.toResponse(user);
    return dto;
  }

  private async findOrCreateUser(input: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    country?: string;
    locationLatitude?: number;
    locationLongitude?: number;
  }): Promise<User> {
    const existing = await this.userRepository.findByFirebaseUid(input.uid);

    if (existing) {
      // Ensure notification preferences exist for legacy users
      const prefs = await this.prefsRepository.findByUserId(existing.id);
      if (!prefs) {
        const defaultPrefs = NotificationPreferences.createDefaults(
          randomUUID(),
          existing.id,
        );
        await this.prefsRepository.save(defaultPrefs);
      }
      return existing;
    }

    // Split display name into firstName / lastName
    const nameParts = input.displayName?.trim().split(' ') ?? [];
    const firstName = nameParts[0] ?? undefined;
    const lastName = nameParts.slice(1).join(' ') || undefined;

    const user = User.create(randomUUID(), input.uid, input.email, {
      firstName,
      lastName,
      avatarUrl: input.photoURL,
      country: input.country ?? 'VE',
      locationLatitude: input.locationLatitude,
      locationLongitude: input.locationLongitude,
    });

    let saved: User;
    try {
      saved = await this.userRepository.save(user);
    } catch (error) {
      // Race condition: another concurrent request already created the user
      if (error instanceof ConflictException) {
        const created = await this.userRepository.findByFirebaseUid(input.uid);
        if (created) return created;
      }
      throw error;
    }

    const defaultPrefs = NotificationPreferences.createDefaults(
      randomUUID(),
      saved.id,
    );
    await this.prefsRepository.save(defaultPrefs);

    return saved;
  }

  private async exchangeCustomToken(
    customToken: string,
  ): Promise<FirebaseCustomTokenResponse> {
    const url = `${this.authUrl}/accounts:signInWithCustomToken?key=${this.apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
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

    if (!response.ok) {
      throw new ExternalServiceException(
        'Firebase Auth',
        'Failed to exchange custom token',
      );
    }

    return response.json() as Promise<FirebaseCustomTokenResponse>;
  }
}
