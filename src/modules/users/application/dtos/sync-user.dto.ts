export class SyncUserDto {
  firebaseUid!: string;
  email!: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  locationLabel?: string;
  locationLatitude?: number;
  locationLongitude?: number;
}
