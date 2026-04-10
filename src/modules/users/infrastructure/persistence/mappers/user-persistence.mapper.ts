import { User } from '../../../domain/entities/user.entity';
import { UserOrmEntity } from '../orm-entities/user.orm-entity';

export class UserPersistenceMapper {
  static toDomain(orm: UserOrmEntity): User {
    return User.reconstitute(
      orm.id,
      orm.firebaseUid,
      orm.email,
      {
        firstName: orm.firstName,
        lastName: orm.lastName,
        avatarUrl: orm.avatarUrl,
        country: orm.country,
        locationLabel: orm.locationLabel,
        locationLatitude: orm.locationLatitude,
        locationLongitude: orm.locationLongitude,
      },
      orm.createdAt,
      orm.updatedAt,
    );
  }

  static toOrm(user: User): UserOrmEntity {
    const orm = new UserOrmEntity();
    orm.id = user.id;
    orm.firebaseUid = user.firebaseUid;
    orm.email = user.email;
    orm.firstName = user.firstName;
    orm.lastName = user.lastName;
    orm.avatarUrl = user.avatarUrl;
    orm.country = user.country;
    orm.locationLabel = user.locationLabel;
    orm.locationLatitude = user.locationLatitude;
    orm.locationLongitude = user.locationLongitude;
    orm.createdAt = user.createdAt;
    orm.updatedAt = user.updatedAt;
    return orm;
  }
}
