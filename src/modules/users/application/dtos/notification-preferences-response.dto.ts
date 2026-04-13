import { ApiProperty } from '@nestjs/swagger';

export class NotificationPreferencesResponseDto {
  @ApiProperty({ example: true })
  pushEnabled!: boolean;

  @ApiProperty({ example: true })
  debtReminders!: boolean;

  @ApiProperty({ example: false })
  priceAlerts!: boolean;

  @ApiProperty({ example: true })
  listReminders!: boolean;

  @ApiProperty({ example: '2026-04-12T15:30:00.000Z' })
  updatedAt!: Date;
}
