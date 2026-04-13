import { NotificationPreferences } from '../../entities/notification-preferences.entity';

export const NOTIFICATION_PREFERENCES_REPOSITORY = Symbol(
  'NOTIFICATION_PREFERENCES_REPOSITORY',
);

export interface INotificationPreferencesRepository {
  findByUserId(userId: string): Promise<NotificationPreferences | null>;
  save(preferences: NotificationPreferences): Promise<NotificationPreferences>;
}
