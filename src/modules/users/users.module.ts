import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from './infrastructure/persistence/orm-entities/user.orm-entity.js';
import { TypeOrmUserRepository } from './infrastructure/persistence/repositories/typeorm-user.repository.js';
import { USER_REPOSITORY } from './domain/interfaces/repositories/user.repository.interface.js';
import { SyncFirebaseUserUseCase } from './application/use-cases/sync-firebase-user.use-case.js';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case.js';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case.js';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case.js';
import { RefreshUserTokenUseCase } from './application/use-cases/refresh-user-token.use-case.js';
import { UsersController } from './infrastructure/controllers/users.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity])],
  controllers: [UsersController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    SyncFirebaseUserUseCase,
    GetUserByIdUseCase,
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshUserTokenUseCase,
  ],
  exports: [SyncFirebaseUserUseCase],
})
export class UsersModule {}
