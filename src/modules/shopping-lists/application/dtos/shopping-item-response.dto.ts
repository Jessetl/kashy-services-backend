import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShoppingItemResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  listId: string;

  @ApiProperty({ example: 'Harina PAN' })
  productName: string;

  @ApiProperty({ example: 'Alimentos' })
  category: string;

  @ApiProperty({ example: 45.5 })
  unitPriceLocal: number;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 91.0 })
  totalLocal: number;

  @ApiPropertyOptional({ example: 1.2, nullable: true })
  unitPriceUsd: number | null;

  @ApiPropertyOptional({ example: 2.4, nullable: true })
  totalUsd: number | null;

  @ApiProperty({ example: false })
  isPurchased: boolean;

  @ApiProperty({ example: '2026-03-27T12:00:00.000Z' })
  createdAt: Date;
}
