import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { NotificationOrmEntity } from './infrastructure/persistence/orm-entities/notification.orm-entity';
import { TypeOrmNotificationRepository } from './infrastructure/persistence/repositories/typeorm-notification.repository';
import { NOTIFICATION_REPOSITORY } from './domain/interfaces/repositories/notification.repository.interface';
import { NOTIFICATION_QUEUE_SERVICE } from './domain/interfaces/notification-queue.service.interface';
import { PUSH_NOTIFICATION_SERVICE } from './domain/interfaces/push-notification.service.interface';
import { RabbitMqNotificationQueueService } from './infrastructure/messaging/rabbitmq-notification-queue.service';
import { RabbitMqNotificationConsumer } from './infrastructure/messaging/rabbitmq-notification.consumer';
import { FcmPushNotificationService } from './infrastructure/push/fcm-push-notification.service';
import { NotificationCronService } from './infrastructure/scheduling/notification-cron.service';
import { ScheduleDebtNotificationUseCase } from './application/use-cases/schedule-debt-notification.use-case';
import { CancelDebtNotificationsUseCase } from './application/use-cases/cancel-debt-notifications.use-case';
import { ProcessPendingNotificationsUseCase } from './application/use-cases/process-pending-notifications.use-case';
import { rabbitmqConfig } from './infrastructure/messaging/rabbitmq.config';
import { DebtsModule } from '../debts/debts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationOrmEntity]),
    ScheduleModule.forRoot(),
    ConfigModule.forFeature(rabbitmqConfig),
    forwardRef(() => DebtsModule),
  ],
  providers: [
    // Repository
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: TypeOrmNotificationRepository,
    },
    // Queue service
    {
      provide: NOTIFICATION_QUEUE_SERVICE,
      useClass: RabbitMqNotificationQueueService,
    },
    // Push notification service
    {
      provide: PUSH_NOTIFICATION_SERVICE,
      useClass: FcmPushNotificationService,
    },
    // Use cases
    ScheduleDebtNotificationUseCase,
    CancelDebtNotificationsUseCase,
    ProcessPendingNotificationsUseCase,
    // Infrastructure
    RabbitMqNotificationConsumer,
    NotificationCronService,
  ],
  exports: [
    NOTIFICATION_REPOSITORY,
    ScheduleDebtNotificationUseCase,
    CancelDebtNotificationsUseCase,
  ],
})
export class NotificationsModule {}
