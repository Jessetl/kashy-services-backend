import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import { UseCase } from '../../../../shared-kernel/application/use-case.js';
import { FIREBASE_ADMIN } from '../../../../shared-kernel/infrastructure/firebase/firebase-admin.provider.js';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface.js';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface.js';
import { User } from '../../domain/entities/user.entity.js';
import { RegisterUserDto } from '../dtos/register-user.dto.js';
import { UserResponseDto } from '../dtos/user-response.dto.js';
import { UserMapper } from '../mappers/user.mapper.js';
import { UserAlreadyExistsException } from '../../domain/exceptions/user-already-exists.exception.js';
import { ConflictException } from '../../../../shared-kernel/domain/exceptions/conflict.exception.js';
import { ExternalServiceException } from '../../../../shared-kernel/domain/exceptions/external-service.exception.js';

@Injectable()
export class RegisterUserUseCase implements UseCase<
  RegisterUserDto,
  UserResponseDto
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(FIREBASE_ADMIN) private readonly firebaseAdmin: typeof admin,
  ) {}

  async execute(input: RegisterUserDto): Promise<UserResponseDto> {
    const displayName = [input.firstName, input.lastName]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(' ')
      .trim();

    // Try-catch solo alrededor de la llamada a Firebase (infraestructura externa)
    let firebaseUser: admin.auth.UserRecord;
    try {
      firebaseUser = await this.firebaseAdmin.auth().createUser({
        email: input.email,
        password: input.password,
        displayName: displayName || undefined,
        photoURL: input.avatarUrl,
      });
    } catch (error) {
      // Firebase lanza errores tipados con code — los transformamos a excepciones de dominio
      if (error instanceof Error && 'code' in error) {
        const firebaseError = error as { code: string; message: string };
        if (firebaseError.code === 'auth/email-already-exists') {
          throw new ConflictException(
            `Email "${input.email}" is already registered`,
          );
        }
        if (firebaseError.code === 'auth/invalid-password') {
          throw new ConflictException(
            'Password does not meet requirements (min 6 characters)',
          );
        }
      }
      throw new ExternalServiceException(
        'Firebase Auth',
        error instanceof Error ? error.message : 'Failed to create user',
      );
    }

    // Logica de dominio — las excepciones de dominio suben sin atraparse
    const existing = await this.userRepository.findByFirebaseUid(
      firebaseUser.uid,
    );

    if (existing) {
      throw new UserAlreadyExistsException(firebaseUser.uid);
    }

    const user = User.create(randomUUID(), firebaseUser.uid, input.email, {
      firstName: input.firstName,
      lastName: input.lastName,
      avatarUrl: input.avatarUrl,
      locationLabel: input.locationLabel,
      locationLatitude: input.locationLatitude,
      locationLongitude: input.locationLongitude,
    });

    const saved = await this.userRepository.save(user);
    return UserMapper.toResponse(saved);
  }
}
