import { BaseEntity } from '../../../../shared-kernel/domain/base-entity';

interface UserDeviceProps {
  userId: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  appVersion: string | null;
  fcmToken: string | null;
  lastActiveAt: Date;
  createdAt: Date;
}

export class UserDevice extends BaseEntity {
  readonly userId: string;
  readonly deviceId: string;
  readonly deviceName: string;
  readonly platform: string;
  readonly appVersion: string | null;
  readonly fcmToken: string | null;
  readonly lastActiveAt: Date;
  readonly createdAt: Date;

  private constructor(id: string, props: UserDeviceProps) {
    super(id);
    this.userId = props.userId;
    this.deviceId = props.deviceId;
    this.deviceName = props.deviceName;
    this.platform = props.platform;
    this.appVersion = props.appVersion;
    this.fcmToken = props.fcmToken;
    this.lastActiveAt = props.lastActiveAt;
    this.createdAt = props.createdAt;
  }

  static create(
    id: string,
    userId: string,
    deviceId: string,
    deviceName: string,
    platform: string,
    appVersion: string | null = null,
    fcmToken: string | null = null,
  ): UserDevice {
    const now = new Date();
    return new UserDevice(id, {
      userId,
      deviceId,
      deviceName,
      platform,
      appVersion,
      fcmToken,
      lastActiveAt: now,
      createdAt: now,
    });
  }

  touch(): UserDevice {
    return new UserDevice(this.id, {
      userId: this.userId,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      platform: this.platform,
      appVersion: this.appVersion,
      fcmToken: this.fcmToken,
      lastActiveAt: new Date(),
      createdAt: this.createdAt,
    });
  }

  refresh(
    userId: string,
    deviceName: string,
    platform: string,
    appVersion: string | null,
    fcmToken: string | null,
  ): UserDevice {
    return new UserDevice(this.id, {
      userId,
      deviceId: this.deviceId,
      deviceName,
      platform,
      appVersion,
      fcmToken,
      lastActiveAt: new Date(),
      createdAt: this.createdAt,
    });
  }

  static reconstitute(id: string, props: UserDeviceProps): UserDevice {
    return new UserDevice(id, props);
  }
}
