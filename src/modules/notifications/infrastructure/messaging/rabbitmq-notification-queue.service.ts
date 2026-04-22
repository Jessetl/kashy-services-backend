import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqplib from 'amqplib';
import type {
  INotificationQueueService,
  NotificationMessage,
} from '../../domain/interfaces/notification-queue.service.interface';
import { NOTIFICATION_QUEUE, NOTIFICATION_EXCHANGE } from './rabbitmq.config';

@Injectable()
export class RabbitMqNotificationQueueService
  implements INotificationQueueService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMqNotificationQueueService.name);
  private channel: amqplib.Channel | null = null;
  private connection: amqplib.ChannelModel | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to connect to RabbitMQ: ${message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      this.logger.log('RabbitMQ connection closed');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error closing RabbitMQ connection: ${message}`);
    }
  }

  private async connect(): Promise<void> {
    const url = this.configService.get<string>(
      'rabbitmq.url',
      'amqp://guest:guest@localhost:5672',
    );

    this.connection = await amqplib.connect(url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(NOTIFICATION_EXCHANGE, 'direct', {
      durable: true,
    });
    await this.channel.assertQueue(NOTIFICATION_QUEUE, { durable: true });
    await this.channel.bindQueue(
      NOTIFICATION_QUEUE,
      NOTIFICATION_EXCHANGE,
      'notification.send',
    );

    this.logger.log('Connected to RabbitMQ');
  }

  async publish(message: NotificationMessage): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    this.channel!.publish(
      NOTIFICATION_EXCHANGE,
      'notification.send',
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
    );

    this.logger.debug(
      `Published notification ${message.notificationId} to queue`,
    );
  }
}
