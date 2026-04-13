import { BaseEntity } from '../../../../shared-kernel/domain/base-entity';

interface NotificationPreferencesProps {
  userId: string;
  pushEnabled?: boolean;
  debtReminders?: boolean;
  priceAlerts?: boolean;
  listReminders?: boolean;
  updatedAt?: Date;
}

export class NotificationPreferences extends BaseEntity {
  readonly userId: string;
  readonly pushEnabled: boolean;
  readonly debtReminders: boolean;
  readonly priceAlerts: boolean;
  readonly listReminders: boolean;
  readonly updatedAt: Date;

  private constructor(id: string, props: NotificationPreferencesProps) {
    super(id);
    this.userId = props.userId;
    this.pushEnabled = props.pushEnabled ?? true;
    this.debtReminders = props.debtReminders ?? true;
    this.priceAlerts = props.priceAlerts ?? false;
    this.listReminders = props.listReminders ?? true;
    this.updatedAt = props.updatedAt ?? new Date();
  }

  static createDefaults(id: string, userId: string): NotificationPreferences {
    return new NotificationPreferences(id, { userId });
  }

  static reconstitute(
    id: string,
    props: Required<NotificationPreferencesProps>,
  ): NotificationPreferences {
    return new NotificationPreferences(id, props);
  }

  update(partial: {
    pushEnabled?: boolean;
    debtReminders?: boolean;
    priceAlerts?: boolean;
    listReminders?: boolean;
  }): NotificationPreferences {
    return new NotificationPreferences(this.id, {
      userId: this.userId,
      pushEnabled: partial.pushEnabled ?? this.pushEnabled,
      debtReminders: partial.debtReminders ?? this.debtReminders,
      priceAlerts: partial.priceAlerts ?? this.priceAlerts,
      listReminders: partial.listReminders ?? this.listReminders,
      updatedAt: new Date(),
    });
  }
}
