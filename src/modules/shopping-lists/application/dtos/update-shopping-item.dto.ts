import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateShoppingItemDto {
  /**
   * Si se envia `id`, se actualiza el item existente.
   * Si no se envia `id`, se crea un item nuevo.
   */
  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID del item existente. Omitir para crear uno nuevo.',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'Harina PAN' })
  @IsString()
  @MaxLength(255)
  productName: string;

  @ApiProperty({ example: 'Alimentos' })
  @IsString()
  @MaxLength(100)
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

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isPurchased?: boolean;
}
