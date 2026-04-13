import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { INotificationPreferencesRepository } from '../../domain/interfaces/repositories/notification-preferences.repository.interface';
import { NOTIFICATION_PREFERENCES_REPOSITORY } from '../../domain/interfaces/repositories/notification-preferences.repository.interface';
import { NotificationPreferencesResponseDto } from '../dtos/notification-preferences-response.dto';

@Injectable()
export class GetNotificationPreferencesUseCase
  implements UseCase<string, NotificationPreferencesResponseDto>
{
  constructor(
    @Inject(NOTIFICATION_PREFERENCES_REPOSITORY)
    private readonly prefsRepository: INotificationPreferencesRepository,
  ) {}

  async execute(userId: string): Promise<NotificationPreferencesResponseDto> {
    const prefs = await this.prefsRepository.findByUserId(userId);

    if (!prefs) {
      throw new NotFoundException(
        'Notification preferences not found for this user',
      );
    }

    return {
      pushEnabled: prefs.pushEnabled,
      debtReminders: prefs.debtReminders,
      priceAlerts: prefs.priceAlerts,
      listReminders: prefs.listReminders,
      updatedAt: prefs.updatedAt,
    };
  }
}
