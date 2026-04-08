import { ApiProperty } from '@nestjs/swagger';
import { ShoppingListResponseDto } from './shopping-list-response.dto';

export class PaginatedShoppingListsResponseDto {
  @ApiProperty({ type: [ShoppingListResponseDto] })
  data!: ShoppingListResponseDto[];

  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;
}
