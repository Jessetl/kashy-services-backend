import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class EditShoppingItemDto {
  @ApiProperty({ example: 'Harina PAN' })
  @IsString()
  @MaxLength(255)
  productName: string;

  @ApiProperty({ example: 'Comida' })
  @IsString()
  @MaxLength(255)
  category: string;

  @ApiProperty({ example: 45.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPriceLocal: number;

  @ApiProperty({ example: 2, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 1.2, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitPriceUsd?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPurchased?: boolean;
}
