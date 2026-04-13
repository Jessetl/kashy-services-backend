import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import type { INotificationRepository } from '../../../domain/interfaces/repositories/notification.repository.interface';
import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationStatus } from '../../../domain/enums/notification-status.enum';
import { NotificationOrmEntity } from '../orm-entities/notification.orm-entity';
import { NotificationPersistenceMapper } from '../mappers/notification-persistence.mapper';

@Injectable()
export class TypeOrmNotificationRepository implements INotificationRepository {
  constructor(
    @InjectRepository(NotificationOrmEntity)
    private readonly ormRepository: Repository<NotificationOrmEntity>,
  ) {}

  async findById(id: string): Promise<Notification | null> {
    const orm = await this.ormRepository.findOne({ where: { id } });
    return orm ? NotificationPersistenceMapper.toDomain(orm) : null;
  }

  async findPendingBefore(date: Date): Promise<Notification[]> {
    const orms = await this.ormRepository.find({
      where: {
        status: NotificationStatus.PENDING,
        scheduledAt: LessThanOrEqual(date),
      },
      order: { scheduledAt: 'ASC' },
    });
    return orms.map(NotificationPersistenceMapper.toDomain);
  }

  async findByDebtId(debtId: string): Promise<Notification[]> {
    const orms = await this.ormRepository.find({
      where: { debtId },
      order: { scheduledAt: 'DESC' },
    });
    return orms.map(NotificationPersistenceMapper.toDomain);
  }

  async save(notification: Notification): Promise<Notification> {
    const orm = NotificationPersistenceMapper.toOrm(notification);
    const saved = await this.ormRepository.save(orm);
    return NotificationPersistenceMapper.toDomain(saved);
  }

  async deleteByDebtId(debtId: string): Promise<void> {
    await this.ormRepository.delete({ debtId });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.ormRepository.delete({
      userId,
      status: NotificationStatus.PENDING,
    });
  }
}
