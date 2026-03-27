import { BaseEntity } from '../../../../shared-kernel/domain/base-entity.js';

interface UserProfileProps {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  locationLabel?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
}

export class User extends BaseEntity {
  readonly firebaseUid: string;
  readonly email: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly avatarUrl: string | null;
  readonly locationLabel: string | null;
  readonly locationLatitude: number | null;
  readonly locationLongitude: number | null;
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
    this.locationLabel = profile.locationLabel ?? null;
    this.locationLatitude = profile.locationLatitude ?? null;
    this.locationLongitude = profile.locationLongitude ?? null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(
    id: string,
    firebaseUid: string,
    email: string,
    profile: UserProfileProps = {},
  ): User {
    const now = new Date();
    return new User(id, firebaseUid, email, profile, now, now);
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
