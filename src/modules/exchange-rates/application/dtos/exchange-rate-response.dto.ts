import { ApiProperty } from '@nestjs/swagger';

export class ExchangeRateResponseDto {
  @ApiProperty({ example: 'VES', description: 'Código ISO 4217 de la moneda local' })
  currency: string;

  @ApiProperty({ example: 468.5145 })
  rateLocalPerUsd: number;

  @ApiProperty({ example: 'oficial' })
  source: string;

  @ApiProperty({ example: '2026-03-27T00:00:00.000Z' })
  fetchedAt: Date;
}
