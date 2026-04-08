import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateShoppingItemDto } from './create-shopping-item.dto';

export class CreateShoppingListDto {
  @ApiProperty({ example: 'Compra semanal' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Supermercado Central' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  storeName?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  ivaEnabled?: boolean;

  @ApiPropertyOptional({ type: [CreateShoppingItemDto], default: [] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShoppingItemDto)
  items?: CreateShoppingItemDto[];
}
