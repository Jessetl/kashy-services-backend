import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'contraseña-actual', minLength: 6 })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({ example: 'nueva-contraseña-segura', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
