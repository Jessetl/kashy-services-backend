import { UserDevice } from '../../../domain/entities/user-device.entity';
import { UserDeviceOrmEntity } from '../orm-entities/user-device.orm-entity';

export class UserDevicePersistenceMapper {
  static toDomain(orm: UserDeviceOrmEntity): UserDevice {
    return UserDevice.reconstitute(orm.id, {
      userId: orm.userId,
      deviceId: orm.deviceId,
      deviceName: orm.deviceName,
      platform: orm.platform,
      appVersion: orm.appVersion,
      fcmToken: orm.fcmToken,
      lastActiveAt: orm.lastActiveAt,
      createdAt: orm.createdAt,
    });
  }

  static toOrm(device: UserDevice): UserDeviceOrmEntity {
    const orm = new UserDeviceOrmEntity();
    orm.id = device.id;
    orm.userId = device.userId;
    orm.deviceId = device.deviceId;
    orm.deviceName = device.deviceName;
    orm.platform = device.platform;
    orm.appVersion = device.appVersion;
    orm.fcmToken = device.fcmToken;
    orm.lastActiveAt = device.lastActiveAt;
    orm.createdAt = device.createdAt;
    return orm;
  }
}
