import { Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import { FIREBASE_ADMIN } from '../../../../shared-kernel/infrastructure/firebase/firebase-admin.provider';
import { NotFoundException } from '../../../../shared-kernel/domain/exceptions/not-found.exception';
import { ExternalServiceException } from '../../../../shared-kernel/domain/exceptions/external-service.exception';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { UserMapper } from '../mappers/user.mapper';

interface Input {
  firebaseUid: string;
  dto: UpdateProfileDto;
}

@Injectable()
export class UpdateProfileUseCase implements UseCase<Input, UserResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(FIREBASE_ADMIN) private readonly firebaseAdmin: typeof admin,
  ) {}

  async execute({ firebaseUid, dto }: Input): Promise<UserResponseDto> {
    const user = await this.userRepository.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException('User', firebaseUid);
    }

    // Actualizar en Firebase si cambia nombre o contraseña
    const firebaseUpdate: admin.auth.UpdateRequest = {};
    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      const first = dto.firstName ?? user.firstName ?? '';
      const last = dto.lastName ?? user.lastName ?? '';
      firebaseUpdate.displayName = `${first} ${last}`.trim();
    }

    if (firebaseUpdate.displayName !== undefined) {
      try {
        await this.firebaseAdmin.auth().updateUser(firebaseUid, firebaseUpdate);
      } catch (error) {
        throw new ExternalServiceException(
          'Firebase Auth',
          error instanceof Error ? error.message : 'Failed to update user',
        );
      }
    }

    const updated = user.updateProfile({
      firstName: dto.firstName,
      lastName: dto.lastName,
      avatarUrl: dto.avatarUrl,
      country: dto.country,
    });

    const saved = await this.userRepository.save(updated);
    return UserMapper.toResponse(saved);
  }
}
