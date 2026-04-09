import { Type } from 'class-transformer';
import { IsDate, IsIn, IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Request shape for POST /sessions/:sessionId/events.
export class CreateEventDto {
  @ApiProperty({ example: 'evt_0001' })
  @IsString()
  eventId!: string;

  @ApiProperty({ enum: ['user_speech', 'bot_speech', 'system'], example: 'user_speech' })
  @IsIn(['user_speech', 'bot_speech', 'system'])
  type!: 'user_speech' | 'bot_speech' | 'system';

  @ApiProperty({
    example: { transcript: 'I want to check my balance', confidence: 0.97 },
    additionalProperties: true
  })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiProperty({ example: '2026-04-09T08:00:05.000Z', type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  timestamp!: Date;
}
