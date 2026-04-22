import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqplib from 'amqplib';
import type { INotificationRepository } from '../../domain/interfaces/repositories/notification.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../domain/interfaces/repositories/notification.repository.interface';
import type { IPushNotificationService } from '../../domain/interfaces/push-notification.service.interface';
import { PUSH_NOTIFICATION_SERVICE } from '../../domain/interfaces/push-notification.service.interface';
import type { NotificationMessage } from '../../domain/interfaces/notification-queue.service.interface';
import { NOTIFICATION_QUEUE } from './rabbitmq.config';

@Injectable()
export class RabbitMqNotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger(RabbitMqNotificationConsumer.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    @Inject(PUSH_NOTIFICATION_SERVICE)
    private readonly pushService: IPushNotificationService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.startConsuming();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to start RabbitMQ consumer: ${message}`);
    }
  }

  private async startConsuming(): Promise<void> {
    const url = this.configService.get<string>(
      'rabbitmq.url',
      'amqp://guest:guest@localhost:5672',
    );

    const connection = await amqplib.connect(url);
    const channel = await connection.createChannel();

    await channel.assertQueue(NOTIFICATION_QUEUE, { durable: true });
    await channel.prefetch(10);

    await channel.consume(NOTIFICATION_QUEUE, (msg) => {
      if (!msg) {
        return;
      }

      try {
        const payload = JSON.parse(
          msg.content.toString(),
        ) as NotificationMessage;

        this.handleMessage(payload)
          .then(() => channel.ack(msg))
          .catch((error) => {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            this.logger.error(`Error processing notification: ${errorMsg}`);
            channel.nack(msg, false, false);
          });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Invalid message format: ${errorMsg}`);
        channel.nack(msg, false, false);
      }
    });

    this.logger.log('RabbitMQ consumer started');
  }

  private async handleMessage(message: NotificationMessage): Promise<void> {
    const notification = await this.notificationRepository.findById(
      message.notificationId,
    );

    if (!notification) {
      this.logger.warn(`Notification ${message.notificationId} not found`);
      return;
    }

    const success = await this.pushService.sendPush(
      message.fcmToken,
      'Recordatorio de deuda',
      `Tu deuda "${message.debtTitle}" vence mañana. ¡No olvides pagarla!`,
      {
        type: 'debt_due_reminder',
        debtId: message.debtId,
      },
    );

    if (success) {
      const updated = notification.markAsSent();
      await this.notificationRepository.save(updated);
      this.logger.log(`Notification ${message.notificationId} sent`);
    } else {
      const updated = notification.markAsFailed();
      await this.notificationRepository.save(updated);
      this.logger.warn(`Notification ${message.notificationId} failed`);
    }
  }
}
