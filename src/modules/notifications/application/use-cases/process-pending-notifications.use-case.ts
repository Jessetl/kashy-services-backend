import { Inject, Injectable, Logger } from '@nestjs/common';
import { UseCase } from '../../../../shared-kernel/application/use-case';
import type { INotificationRepository } from '../../domain/interfaces/repositories/notification.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../domain/interfaces/repositories/notification.repository.interface';
import type { INotificationQueueService } from '../../domain/interfaces/notification-queue.service.interface';
import { NOTIFICATION_QUEUE_SERVICE } from '../../domain/interfaces/notification-queue.service.interface';
import type { IUserRepository } from '../../../users/domain/interfaces/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/interfaces/repositories/user.repository.interface';
import type { INotificationPreferencesRepository } from '../../../users/domain/interfaces/repositories/notification-preferences.repository.interface';
import { NOTIFICATION_PREFERENCES_REPOSITORY } from '../../../users/domain/interfaces/repositories/notification-preferences.repository.interface';
import type { IDebtRepository } from '../../../debts/domain/interfaces/repositories/debt.repository.interface';
import { DEBT_REPOSITORY } from '../../../debts/domain/interfaces/repositories/debt.repository.interface';

@Injectable()
export class ProcessPendingNotificationsUseCase
  implements UseCase<void, number>
{
  private readonly logger = new Logger(ProcessPendingNotificationsUseCase.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    @Inject(NOTIFICATION_QUEUE_SERVICE)
    private readonly queueService: INotificationQueueService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(NOTIFICATION_PREFERENCES_REPOSITORY)
    private readonly prefsRepository: INotificationPreferencesRepository,
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepository: IDebtRepository,
  ) {}

  async execute(): Promise<number> {
    const now = new Date();
    const pending = await this.notificationRepository.findPendingBefore(now);

    if (pending.length === 0) return 0;

    let published = 0;

    for (const notification of pending) {
      try {
        const user = await this.userRepository.findById(notification.userId);
        if (!user || !user.fcmToken) continue;

        const prefs = await this.prefsRepository.findByUserId(notification.userId);
        if (!prefs || !prefs.pushEnabled || !prefs.debtReminders) continue;

        const debt = await this.debtRepository.findById(notification.debtId);
        if (!debt) continue;

        await this.queueService.publish({
          notificationId: notification.id,
          userId: notification.userId,
          debtId: notification.debtId,
          debtTitle: debt.title,
          fcmToken: user.fcmToken,
        });

        published++;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to publish notification ${notification.id}: ${message}`,
        );
      }
    }

    this.logger.log(`Published ${published}/${pending.length} notifications`);
    return published;
  }
}
