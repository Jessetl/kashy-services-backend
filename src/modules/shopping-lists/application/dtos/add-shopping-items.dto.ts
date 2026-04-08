import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateShoppingItemDto } from './create-shopping-item.dto';

export class AddShoppingItemsDto {
  @ApiProperty({ type: [CreateShoppingItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateShoppingItemDto)
  items!: CreateShoppingItemDto[];
}
