import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import { UnauthorizedException } from '../../../../shared-kernel/domain/exceptions/unauthorized.exception';
import type { IUserRepository } from '../../domain/interfaces/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/interfaces/repositories/user.repository.interface';
import { SeedLoginDto } from '../dtos/seed-login.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class SeedLoginUseCase implements UseCase<SeedLoginDto, UserResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async execute(input: SeedLoginDto): Promise<UserResponseDto> {
    if (process.env.NODE_ENV !== 'development') {
      throw new UnauthorizedException('Seed login is only available in development');
    }

    const user = await this.userRepository.findByFirebaseUid(input.firebaseUid);
    if (!user) {
      throw new UnauthorizedException(`No seed user found with firebase_uid "${input.firebaseUid}"`);
    }

    return UserMapper.toResponse(user);
  }
}
