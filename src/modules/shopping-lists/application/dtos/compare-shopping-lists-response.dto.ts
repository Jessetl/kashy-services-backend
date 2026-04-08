import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompareItemPriceDto {
  @ApiProperty({ example: 'Harina PAN' })
  productName!: string;

  @ApiProperty({
    example: [
      { listId: 'uuid-1', listName: 'Compra Enero', unitPriceLocal: 45.5 },
      { listId: 'uuid-2', listName: 'Compra Febrero', unitPriceLocal: 50.0 },
    ],
  })
  prices!: CompareItemListPriceDto[];
}

export class CompareItemListPriceDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  listId!: string;

  @ApiProperty({ example: 'Compra semanal' })
  listName!: string;

  @ApiProperty({ example: 45.5 })
  unitPriceLocal!: number;

  @ApiPropertyOptional({ example: 1.2, nullable: true })
  unitPriceUsd!: number | null;
}

export class CompareShoppingListsResponseDto {
  @ApiProperty({ type: [CompareItemPriceDto] })
  comparisons!: CompareItemPriceDto[];
}
