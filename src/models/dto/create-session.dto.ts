import { Type } from 'class-transformer';
import { IsDate, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Request shape for POST /sessions.
export class CreateSessionDto {
  @ApiProperty({ example: 'sess_1001' })
  @IsString()
  sessionId!: string;

  @ApiProperty({ enum: ['initiated', 'active', 'completed', 'failed'], example: 'initiated' })
  @IsIn(['initiated', 'active', 'completed', 'failed'])
  status!: 'initiated' | 'active' | 'completed' | 'failed';

  @ApiProperty({ example: 'en' })
  @IsString()
  language!: string;

  @ApiProperty({ example: '2026-04-09T08:00:00.000Z', type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startedAt!: Date;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    type: String,
    format: 'date-time'
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endedAt?: Date | null;

  @ApiPropertyOptional({
    example: { source: 'ivr', region: 'eu-west-1' },
    additionalProperties: true
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
