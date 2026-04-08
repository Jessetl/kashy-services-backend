import { ApiProperty } from '@nestjs/swagger';

export class SpendingStatDto {
  @ApiProperty({ example: '2026-03-24T00:00:00.000Z' })
  period!: string;

  @ApiProperty({ example: 1500.75 })
  totalLocal!: number;

  @ApiProperty({ example: 41.12 })
  totalUsd!: number;

  @ApiProperty({ example: 3 })
  listCount!: number;
}

export class SpendingStatsResponseDto {
  @ApiProperty({ example: 'week', enum: ['week', 'month'] })
  period!: string;

  @ApiProperty({ type: [SpendingStatDto] })
  stats!: SpendingStatDto[];
}
