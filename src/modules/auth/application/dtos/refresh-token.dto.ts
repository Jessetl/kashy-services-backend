import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'AOEOulY...',
    description:
      'Refresh token de Firebase que el cliente guarda en Keychain/Keystore.',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
