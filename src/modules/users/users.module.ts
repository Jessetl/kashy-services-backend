import { Global, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from './infrastructure/persistence/orm-entities/user.orm-entity';
import { NotificationPreferencesOrmEntity } from './infrastructure/persistence/orm-entities/notification-preferences.orm-entity';
import { TypeOrmUserRepository } from './infrastructure/persistence/repositories/typeorm-user.repository';
import { TypeOrmNotificationPreferencesRepository } from './infrastructure/persistence/repositories/typeorm-notification-preferences.repository';
import { USER_REPOSITORY } from './domain/interfaces/repositories/user.repository.interface';
import { NOTIFICATION_PREFERENCES_REPOSITORY } from './domain/interfaces/repositories/notification-preferences.repository.interface';
import { SyncFirebaseUserUseCase } from './application/use-cases/sync-firebase-user.use-case';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { RefreshUserTokenUseCase } from './application/use-cases/refresh-user-token.use-case';
import { GetNotificationPreferencesUseCase } from './application/use-cases/get-notification-preferences.use-case';
import { UpdateNotificationPreferencesUseCase } from './application/use-cases/update-notification-preferences.use-case';
import { SeedLoginUseCase } from './application/use-cases/seed-login.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { GoogleAuthUseCase } from './application/use-cases/google-auth.use-case';
import { UsersController } from './infrastructure/controllers/users.controller';
import { FIREBASE_USER_SYNC_PORT } from '../../shared-kernel/domain/interfaces/firebase-user-sync.port';
import { DebtsModule } from '../debts/debts.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity, NotificationPreferencesOrmEntity]),
    forwardRef(() => DebtsModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [UsersController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    {
      provide: NOTIFICATION_PREFERENCES_REPOSITORY,
      useClass: TypeOrmNotificationPreferencesRepository,
    },
    SyncFirebaseUserUseCase,
    {
      provide: FIREBASE_USER_SYNC_PORT,
      useExisting: SyncFirebaseUserUseCase,
    },
    GetUserByIdUseCase,
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshUserTokenUseCase,
    GetNotificationPreferencesUseCase,
    UpdateNotificationPreferencesUseCase,
    SeedLoginUseCase,
    UpdateProfileUseCase,
    ChangePasswordUseCase,
    GoogleAuthUseCase,
  ],
  exports: [
    USER_REPOSITORY,
    NOTIFICATION_PREFERENCES_REPOSITORY,
    SyncFirebaseUserUseCase,
    FIREBASE_USER_SYNC_PORT,
  ],
})
export class UsersModule {}
