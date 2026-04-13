import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SeedLoginDto {
  @ApiProperty({
    example: 'seed-firebase-uid-juan-001',
    description: 'firebase_uid del usuario seed (solo disponible en development)',
  })
  @IsString()
  @MinLength(1)
  firebaseUid: string;
}
