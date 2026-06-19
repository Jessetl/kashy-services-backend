import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIs...',
    description: 'JWT custom firmado por el backend (TTL 15 min)',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'AOEOulY...',
    description:
      'Refresh token de Firebase. Cliente debe guardarlo en Keychain (iOS) o Keystore (Android). Nunca en AsyncStorage ni almacenamiento sin cifrar.',
  })
  refreshToken!: string;

  @ApiProperty({ example: 900, description: 'TTL del JWT en segundos' })
  expiresIn!: number;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
