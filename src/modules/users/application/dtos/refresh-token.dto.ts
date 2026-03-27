import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'AMf-vBx...' })
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
