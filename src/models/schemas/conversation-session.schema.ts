import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

// Allowed lifecycle states for a conversation session.
export type SessionStatus = 'initiated' | 'active' | 'completed' | 'failed';

// MongoDB model representing the session aggregate root.
@Schema({
  collection: 'conversation_sessions',
  timestamps: false
})
export class ConversationSession {
  @Prop({ required: true, unique: true, index: true })
  sessionId!: string;

  @Prop({ required: true, enum: ['initiated', 'active', 'completed', 'failed'] })
  status!: SessionStatus;

  @Prop({ required: true })
  language!: string;

  @Prop({ required: true })
  startedAt!: Date;

  @Prop({ type: Date, default: null })
  endedAt!: Date | null;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  metadata?: Record<string, unknown>;
}

export type ConversationSessionDocument = HydratedDocument<ConversationSession>;

// Generates schema + configured indexes from decorators.
export const ConversationSessionSchema = SchemaFactory.createForClass(ConversationSession);
