import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShoppingItemResponseDto } from './shopping-item-response.dto';

export class ShoppingListResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id!: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId!: string;

  @ApiProperty({ example: 'Compra semanal' })
  name!: string;

  @ApiPropertyOptional({ example: 'Supermercado Central', nullable: true })
  storeName!: string | null;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'COMPLETED'] })
  status!: string;

  @ApiProperty({ example: false })
  ivaEnabled!: boolean;

  @ApiProperty({ example: 150.75 })
  totalLocal!: number;

  @ApiProperty({ example: 4.12 })
  totalUsd!: number;

  @ApiPropertyOptional({ example: 36.5, nullable: true })
  exchangeRateSnapshot!: number | null;

  @ApiProperty({ example: '2026-03-27T12:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2026-03-27T18:00:00.000Z', nullable: true })
  completedAt!: Date | null;

  @ApiProperty({ type: [ShoppingItemResponseDto] })
  items!: ShoppingItemResponseDto[];
}
