import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Firebase ID token obtained after Google Sign-In on the client' })
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @ApiPropertyOptional({ description: 'Google OAuth access token (for future use)' })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiPropertyOptional({ example: 'VE', description: 'ISO 3166-1 alpha-2 country code' })
  @IsString()
  @IsOptional()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ example: 10.4806 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  locationLatitude?: number;

  @ApiPropertyOptional({ example: -66.9036 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  locationLongitude?: number;
}
