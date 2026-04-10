import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import { ConflictException } from '../../../../shared-kernel/domain/exceptions/conflict.exception';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { SyncUserDto } from '../dtos/sync-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class SyncFirebaseUserUseCase implements UseCase<
  SyncUserDto,
  UserResponseDto
> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: SyncUserDto): Promise<UserResponseDto> {
    const existing = await this.userRepository.findByFirebaseUid(
      input.firebaseUid,
    );

    if (existing) {
      return UserMapper.toResponse(existing);
    }

    const user = User.create(randomUUID(), input.firebaseUid, input.email, {
      firstName: input.firstName,
      lastName: input.lastName,
      avatarUrl: input.avatarUrl,
      country: 'VE',
      locationLabel: input.locationLabel,
      locationLatitude: input.locationLatitude,
      locationLongitude: input.locationLongitude,
    });

    // Try-catch para race condition: si dos requests concurrentes pasan el check
    // de arriba, el segundo save falla por unique constraint — recuperamos buscando
    // al usuario que ya fue creado por el primer request
    try {
      const saved = await this.userRepository.save(user);
      return UserMapper.toResponse(saved);
    } catch (error) {
      if (error instanceof ConflictException) {
        const created = await this.userRepository.findByFirebaseUid(
          input.firebaseUid,
        );
        if (created) {
          return UserMapper.toResponse(created);
        }
      }
      throw error;
    }
  }
}
