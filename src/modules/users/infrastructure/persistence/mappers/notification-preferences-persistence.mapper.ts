import { NotificationPreferences } from '../../../domain/entities/notification-preferences.entity';
import { NotificationPreferencesOrmEntity } from '../orm-entities/notification-preferences.orm-entity';

export class NotificationPreferencesPersistenceMapper {
  static toDomain(orm: NotificationPreferencesOrmEntity): NotificationPreferences {
    return NotificationPreferences.reconstitute(orm.id, {
      userId: orm.userId,
      pushEnabled: orm.pushEnabled,
      debtReminders: orm.debtReminders,
      priceAlerts: orm.priceAlerts,
      listReminders: orm.listReminders,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: NotificationPreferences): Partial<NotificationPreferencesOrmEntity> {
    return {
      id: domain.id,
      userId: domain.userId,
      pushEnabled: domain.pushEnabled,
      debtReminders: domain.debtReminders,
      priceAlerts: domain.priceAlerts,
      listReminders: domain.listReminders,
    };
  }
}
