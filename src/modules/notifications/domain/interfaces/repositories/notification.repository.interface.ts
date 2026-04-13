import { Notification } from '../../entities/notification.entity';

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findPendingBefore(date: Date): Promise<Notification[]>;
  findByDebtId(debtId: string): Promise<Notification[]>;
  save(notification: Notification): Promise<Notification>;
  deleteByDebtId(debtId: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
