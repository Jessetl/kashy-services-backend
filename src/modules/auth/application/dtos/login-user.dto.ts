import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({ example: 'jane.doe@kashy.app' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  password!: string;
}
