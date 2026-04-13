import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { INotificationPreferencesRepository } from '../../domain/interfaces/repositories/notification-preferences.repository.interface';
import { NOTIFICATION_PREFERENCES_REPOSITORY } from '../../domain/interfaces/repositories/notification-preferences.repository.interface';
import type { IDebtRepository } from '../../../debts/domain/interfaces/repositories/debt.repository.interface';
import { DEBT_REPOSITORY } from '../../../debts/domain/interfaces/repositories/debt.repository.interface';
import type { INotificationRepository } from '../../../notifications/domain/interfaces/repositories/notification.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../../notifications/domain/interfaces/repositories/notification.repository.interface';
import { ScheduleDebtNotificationUseCase } from '../../../notifications/application/use-cases/schedule-debt-notification.use-case';
import { UpdateNotificationPreferencesDto } from '../dtos/update-notification-preferences.dto';
import { NotificationPreferencesResponseDto } from '../dtos/notification-preferences-response.dto';

interface UpdateNotificationPreferencesInput {
  userId: string;
  dto: UpdateNotificationPreferencesDto;
}

@Injectable()
export class UpdateNotificationPreferencesUseCase implements UseCase<
  UpdateNotificationPreferencesInput,
  NotificationPreferencesResponseDto
> {
  constructor(
    @Inject(NOTIFICATION_PREFERENCES_REPOSITORY)
    private readonly prefsRepository: INotificationPreferencesRepository,
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepository: IDebtRepository,
    private readonly scheduleDebtNotification: ScheduleDebtNotificationUseCase,
  ) {}

  async execute(
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferencesResponseDto> {
    const { userId, dto } = input;

    const existing = await this.prefsRepository.findByUserId(userId);

    if (!existing) {
      throw new NotFoundException(
        'Notification preferences not found for this user',
      );
    }

    const updated = existing.update(dto);
    const saved = await this.prefsRepository.save(updated);

    const disabledPush = existing.pushEnabled && !saved.pushEnabled;
    if (disabledPush) {
      await this.notificationRepository.deleteByUserId(userId);
    }

    const enabledPush = !existing.pushEnabled && saved.pushEnabled;
    if (enabledPush && saved.debtReminders) {
      const debts = await this.debtRepository.findByUserId(userId, {
        isPaid: false,
      });

      for (const debt of debts) {
        if (!debt.dueDate) continue;

        await this.scheduleDebtNotification.execute({
          userId,
          debtId: debt.id,
          dueDate: debt.dueDate,
        });
      }
    }

    return {
      pushEnabled: saved.pushEnabled,
      debtReminders: saved.debtReminders,
      priceAlerts: saved.priceAlerts,
      listReminders: saved.listReminders,
      updatedAt: saved.updatedAt,
    };
  }
}
