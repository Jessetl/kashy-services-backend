import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { INotificationPreferencesRepository } from '../../../domain/interfaces/repositories/notification-preferences.repository.interface';
import { NotificationPreferences } from '../../../domain/entities/notification-preferences.entity';
import { NotificationPreferencesOrmEntity } from '../orm-entities/notification-preferences.orm-entity';
import { NotificationPreferencesPersistenceMapper } from '../mappers/notification-preferences-persistence.mapper';

@Injectable()
export class TypeOrmNotificationPreferencesRepository
  implements INotificationPreferencesRepository
{
  constructor(
    @InjectRepository(NotificationPreferencesOrmEntity)
    private readonly ormRepository: Repository<NotificationPreferencesOrmEntity>,
  ) {}

  async findByUserId(userId: string): Promise<NotificationPreferences | null> {
    const orm = await this.ormRepository.findOne({ where: { userId } });
    return orm ? NotificationPreferencesPersistenceMapper.toDomain(orm) : null;
  }

  async save(preferences: NotificationPreferences): Promise<NotificationPreferences> {
    const orm = NotificationPreferencesPersistenceMapper.toOrm(preferences);
    const saved = await this.ormRepository.save(orm);
    return NotificationPreferencesPersistenceMapper.toDomain(saved);
  }
}
