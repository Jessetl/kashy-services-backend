import { User } from '../../domain/entities/user.entity.js';
import { UserResponseDto } from '../dtos/user-response.dto.js';

export class UserMapper {
  static toResponse(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.firebaseUid = user.firebaseUid;
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.avatarUrl = user.avatarUrl;
    dto.locationLabel = user.locationLabel;
    dto.locationLatitude = user.locationLatitude;
    dto.locationLongitude = user.locationLongitude;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
