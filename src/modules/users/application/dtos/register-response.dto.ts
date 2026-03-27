import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({
    example:
      'Registration successful. Please verify your email before logging in.',
  })
  message: string;
}
