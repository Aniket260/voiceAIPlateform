import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

// Supported event types emitted during a voice session.
export type EventType = 'user_speech' | 'bot_speech' | 'system';

// MongoDB model for immutable timeline events.
@Schema({
  collection: 'conversation_events',
  timestamps: false
})
export class ConversationEvent {
  @Prop({ required: true })
  eventId!: string;

  @Prop({ required: true, index: true })
  sessionId!: string;

  @Prop({ required: true, enum: ['user_speech', 'bot_speech', 'system'] })
  type!: EventType;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payload!: Record<string, unknown>;

  @Prop({ required: true, index: true })
  timestamp!: Date;
}

export type ConversationEventDocument = HydratedDocument<ConversationEvent>;

export const ConversationEventSchema = SchemaFactory.createForClass(ConversationEvent);
// Enforces idempotency for event writes within a session.
ConversationEventSchema.index({ sessionId: 1, eventId: 1 }, { unique: true });
// Optimizes read pattern: session timeline ordered by timestamp.
ConversationEventSchema.index({ sessionId: 1, timestamp: 1 });
