import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from './infrastructure/persistence/orm-entities/user.orm-entity';
import { UserDeviceOrmEntity } from './infrastructure/persistence/orm-entities/user-device.orm-entity';
import { TypeOrmUserRepository } from './infrastructure/persistence/repositories/typeorm-user.repository';
import { TypeOrmUserDeviceRepository } from './infrastructure/persistence/repositories/typeorm-user-device.repository';
import { FirebaseAuthService } from './infrastructure/services/firebase-auth.service';
import { USER_REPOSITORY } from './domain/interfaces/repositories/user.repository.interface';
import { USER_DEVICE_REPOSITORY } from './domain/interfaces/repositories/user-device.repository.interface';
import { FIREBASE_AUTH_SERVICE } from './domain/interfaces/services/firebase-auth.service.interface';
import { FIREBASE_USER_SYNC_PORT } from '../../shared-kernel/domain/interfaces/firebase-user-sync.port';
import { USER_READER } from '../../shared-kernel/application/ports/user-reader.port';
import { USER_DEVICE_READER } from '../../shared-kernel/application/ports/user-device-reader.port';
import { UserReaderAdapter } from './infrastructure/ports/user-reader.adapter';
import { UserDeviceReaderAdapter } from './infrastructure/ports/user-device-reader.adapter';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { LoginWithGoogleUseCase } from './application/use-cases/login-with-google.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { RecoverPasswordUseCase } from './application/use-cases/recover-password.use-case';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { SyncFirebaseUserUseCase } from './application/use-cases/sync-firebase-user.use-case';
import { JwtTokenService } from './application/services/jwt-token.service';
import { AuthController } from './infrastructure/controllers/auth.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity, UserDeviceOrmEntity])],
  controllers: [AuthController],
  providers: [
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
    { provide: USER_DEVICE_REPOSITORY, useClass: TypeOrmUserDeviceRepository },
    { provide: FIREBASE_AUTH_SERVICE, useClass: FirebaseAuthService },
    { provide: USER_READER, useClass: UserReaderAdapter },
    { provide: USER_DEVICE_READER, useClass: UserDeviceReaderAdapter },
    JwtTokenService,
    RegisterUserUseCase,
    LoginUserUseCase,
    LoginWithGoogleUseCase,
    RefreshTokenUseCase,
    ChangePasswordUseCase,
    RecoverPasswordUseCase,
    GetUserByIdUseCase,
    UpdateProfileUseCase,
    LogoutUseCase,
    SyncFirebaseUserUseCase,
    {
      provide: FIREBASE_USER_SYNC_PORT,
      useExisting: SyncFirebaseUserUseCase,
    },
  ],
  exports: [USER_READER, USER_DEVICE_READER, FIREBASE_USER_SYNC_PORT],
})
export class AuthModule {}
