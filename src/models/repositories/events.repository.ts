import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConversationEvent, ConversationEventDocument, EventType } from '../schemas/conversation-event.schema';

// Internal input contract for creating immutable events.
export interface EventCreateInput {
  sessionId: string;
  eventId: string;
  type: EventType;
  payload: Record<string, unknown>;
  timestamp: Date;
}

@Injectable()
export class EventsRepository {
  constructor(
    @InjectModel(ConversationEvent.name)
    private readonly eventModel: Model<ConversationEventDocument>
  ) {}

  async create(event: EventCreateInput): Promise<ConversationEvent> {
    // Create is append-only; updates are intentionally not implemented.
    const created = await this.eventModel.create(event);
    return created.toObject() as ConversationEvent;
  }

  async findBySessionAndEventId(sessionId: string, eventId: string): Promise<ConversationEvent | null> {
    // Used to return existing event after duplicate-key retries.
    return this.eventModel.findOne({ sessionId, eventId }).lean<ConversationEvent>().exec();
  }

  async listBySession(sessionId: string, page: number, limit: number): Promise<ConversationEvent[]> {
    // Stable timestamp ordering supports deterministic pagination.
    const skip = (page - 1) * limit;
    return this.eventModel
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit)
      .lean<ConversationEvent[]>()
      .exec();
  }

  async countBySession(sessionId: string): Promise<number> {
    // Paired with list query to provide client pagination metadata.
    return this.eventModel.countDocuments({ sessionId }).exec();
  }
}
