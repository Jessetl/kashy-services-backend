import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { UpdateShoppingItemDto } from './update-shopping-item.dto';

export class UpdateShoppingListDto {
  @ApiPropertyOptional({ example: 'Compra del mes' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Automercado Plaza' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  storeName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  ivaEnabled?: boolean;

  @ApiPropertyOptional({
    type: [UpdateShoppingItemDto],
    description:
      'Items de la lista. Items con id se actualizan, sin id se crean. Items existentes no incluidos se eliminan.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateShoppingItemDto)
  items?: UpdateShoppingItemDto[];
}
