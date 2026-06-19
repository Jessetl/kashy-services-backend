import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  NormalizeName,
  TrimLowercase,
  TrimUppercase,
} from '../../../../shared-kernel/application/decorators/sanitize.decorators';
import { IsPersonName } from '../../../../shared-kernel/application/decorators/validation.decorators';

export class RegisterUserDto {
  @ApiProperty({ example: 'jane.doe@kashy.app' })
  @TrimLowercase()
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123', minLength: 8, maxLength: 64 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @ApiProperty({ example: 'Jane', maxLength: 80 })
  @NormalizeName()
  @IsPersonName()
  @IsString()
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Doe', maxLength: 80 })
  @NormalizeName()
  @IsPersonName()
  @IsString()
  @MaxLength(80)
  lastName!: string;

  @ApiProperty({ example: 'VE', description: 'Codigo ISO 3166-1 alpha-2' })
  @TrimUppercase()
  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @ApiPropertyOptional({ example: 10.4806 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -66.9036 })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
