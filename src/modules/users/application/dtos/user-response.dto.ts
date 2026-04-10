import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'FbUid123abc' })
  firebaseUid!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Juan', nullable: true })
  firstName!: string | null;

  @ApiPropertyOptional({ example: 'Perez', nullable: true })
  lastName!: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.miapp.com/avatar.jpg',
    nullable: true,
  })
  avatarUrl?: string | null;

  @ApiProperty({ example: 'VE', nullable: true })
  country!: string | null;

  @ApiPropertyOptional({ example: 'Monterrey, NL', nullable: true })
  locationLabel!: string | null;

  @ApiPropertyOptional({ example: 25.6866, nullable: true })
  locationLatitude!: number | null;

  @ApiPropertyOptional({ example: -100.3161, nullable: true })
  locationLongitude!: number | null;

  @ApiProperty({ example: '2026-03-24T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-24T12:00:00.000Z' })
  updatedAt!: Date;
}
