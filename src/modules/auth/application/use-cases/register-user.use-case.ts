import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface';
import type { IFirebaseAuthService } from '../../domain/interfaces/services/firebase-auth.service.interface';
import { FIREBASE_AUTH_SERVICE } from '../../domain/interfaces/services/firebase-auth.service.interface';
import {
  USER_REGISTERED,
  UserRegisteredEvent,
} from '../../../../shared-kernel/domain/events/user.events';
import { User } from '../../domain/entities/user.entity';
import { UserAlreadyExistsException } from '../../domain/exceptions/user-already-exists.exception';
import { RegisterUserDto } from '../dtos/register-user.dto';
import { RegisterResponseDto } from '../dtos/register-response.dto';

const SUCCESS_MESSAGE =
  'Usuario registrado. Revisa tu correo para verificar la cuenta antes de iniciar sesion.';

@Injectable()
export class RegisterUserUseCase implements UseCase<
  RegisterUserDto,
  RegisterResponseDto
> {
  private readonly logger = new Logger(RegisterUserUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(FIREBASE_AUTH_SERVICE)
    private readonly firebaseAuth: IFirebaseAuthService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: RegisterUserDto): Promise<RegisterResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new UserAlreadyExistsException();
    }

    const displayName =
      [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim() ||
      undefined;

    const firebaseResult = await this.firebaseAuth.signUp({
      email: dto.email,
      password: dto.password,
      displayName,
    });

    let savedUserId: string;
    try {
      const user = User.create(
        randomUUID(),
        firebaseResult.firebaseUid,
        dto.email,
        dto.countryCode,
        dto.firstName,
        dto.lastName,
        null,
        dto.latitude ?? null,
        dto.longitude ?? null,
      );

      const savedUser = await this.userRepository.save(user);
      savedUserId = savedUser.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `DB persistence failed after Firebase signup. Rolling back Firebase user. Reason: ${message}`,
      );

      try {
        await this.firebaseAuth.deleteUser(firebaseResult.firebaseUid);
      } catch (rollbackErr) {
        this.logger.error(
          `Firebase rollback failed: ${JSON.stringify(rollbackErr)}. Manual cleanup may be required for UID: ${firebaseResult.firebaseUid}.`,
        );
      }

      throw new InternalServerErrorException(
        'Fallo interno al crear la cuenta. Por favor intenta de nuevo.',
      );
    }

    await this.eventEmitter.emitAsync(
      USER_REGISTERED,
      new UserRegisteredEvent(savedUserId),
    );

    try {
      await this.firebaseAuth.sendEmailVerification(firebaseResult.idToken);
    } catch (error) {
      this.logger.warn(
        `Failed to send verification email to ${dto.email}: ${JSON.stringify(error)}. User account created but email verification may not have been sent.`,
      );
    }

    return {
      message: SUCCESS_MESSAGE,
      email: dto.email,
    };
  }
}
