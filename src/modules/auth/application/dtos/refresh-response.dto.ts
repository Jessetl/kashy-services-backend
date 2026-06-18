import { ApiProperty } from '@nestjs/swagger';

export class RefreshResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIs...',
    description: 'Nuevo JWT custom firmado por el backend (TTL 15 min)',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'AOEOulY...',
    description:
      'Refresh token de Firebase. Rotado si Firebase devolvió uno nuevo; sino, el mismo del request. Cliente debe sobrescribir el valor anterior en Keychain/Keystore.',
  })
  refreshToken!: string;

  @ApiProperty({ example: 900, description: 'TTL del JWT en segundos' })
  expiresIn!: number;
}
