import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto.js';

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJSUzI1NiIs...' })
  idToken: string;

  @ApiProperty({ example: 'AMf-vBx...' })
  refreshToken: string;

  @ApiProperty({ example: '3600' })
  expiresIn: string;

  @ApiPropertyOptional({ type: UserResponseDto })
  user?: UserResponseDto;
}
