import { ApiProperty } from '@nestjs/swagger';

export class DeleteShoppingListResponseDto {
  @ApiProperty({ example: 'Lista borrada exitosamente' })
  message!: string;
}
