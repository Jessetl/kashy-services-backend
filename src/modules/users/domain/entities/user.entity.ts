import { BaseEntity } from '../../../../shared-kernel/domain/base-entity';

interface UserProfileProps {
  country: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  locationLabel?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  notificationEnabled?: boolean;
  fcmToken?: string | null;
}

export class User extends BaseEntity {
  readonly firebaseUid: string;
  readonly email: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly avatarUrl: string | null;
  readonly country: string;
  readonly locationLabel: string | null;
  readonly locationLatitude: number | null;
  readonly locationLongitude: number | null;
  readonly notificationEnabled: boolean;
  readonly fcmToken: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(
    id: string,
    firebaseUid: string,
    email: string,
    profile: UserProfileProps,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id);
    this.firebaseUid = firebaseUid;
    this.email = email;
    this.firstName = profile.firstName ?? null;
    this.lastName = profile.lastName ?? null;
    this.avatarUrl = profile.avatarUrl ?? null;
    this.country = profile.country;
    this.locationLabel = profile.locationLabel ?? null;
    this.locationLatitude = profile.locationLatitude ?? null;
    this.locationLongitude = profile.locationLongitude ?? null;
    this.notificationEnabled = profile.notificationEnabled ?? true;
    this.fcmToken = profile.fcmToken ?? null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(
    id: string,
    firebaseUid: string,
    email: string,
    profile: UserProfileProps,
  ): User {
    const now = new Date();
    return new User(id, firebaseUid, email, profile, now, now);
  }

  updateProfile(changes: {
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
    country?: string;
  }): User {
    return new User(
      this.id,
      this.firebaseUid,
      this.email,
      {
        firstName: 'firstName' in changes ? changes.firstName : this.firstName,
        lastName: 'lastName' in changes ? changes.lastName : this.lastName,
        avatarUrl: 'avatarUrl' in changes ? changes.avatarUrl : this.avatarUrl,
        country: changes.country ?? this.country,
        locationLabel: this.locationLabel,
        locationLatitude: this.locationLatitude,
        locationLongitude: this.locationLongitude,
        notificationEnabled: this.notificationEnabled,
        fcmToken: this.fcmToken,
      },
      this.createdAt,
      new Date(),
    );
  }

  static reconstitute(
    id: string,
    firebaseUid: string,
    email: string,
    profile: UserProfileProps,
    createdAt: Date,
    updatedAt: Date,
  ): User {
    return new User(id, firebaseUid, email, profile, createdAt, updatedAt);
  }
}
