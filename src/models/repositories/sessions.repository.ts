import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  ConversationSession,
  ConversationSessionDocument,
  SessionStatus
} from '../schemas/conversation-session.schema';

// Internal input contract for creating sessions.
export interface SessionCreateInput {
  sessionId: string;
  status: SessionStatus;
  language: string;
  startedAt: Date;
  endedAt?: Date | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SessionsRepository {
  constructor(
    @InjectModel(ConversationSession.name)
    private readonly sessionModel: Model<ConversationSessionDocument>
  ) {}

  async createIfMissing(input: SessionCreateInput): Promise<ConversationSession> {
    // Atomic create-or-get via upsert; existing documents are not mutated.
    const session = await this.sessionModel
      .findOneAndUpdate(
        { sessionId: input.sessionId },
        {
          $setOnInsert: {
            ...input,
            endedAt: input.endedAt ?? null
          }
        },
        {
          upsert: true,
          new: true
        }
      )
      .lean<ConversationSession>()
      .exec();

    return session as ConversationSession;
  }

  async findBySessionId(sessionId: string): Promise<ConversationSession | null> {
    // Lean read for lower overhead and plain object responses.
    return this.sessionModel.findOne({ sessionId }).lean<ConversationSession>().exec();
  }

  async completeIfNeeded(sessionId: string, endedAt: Date): Promise<ConversationSession | null> {
    // Conditional transition prevents rewriting completed sessions.
    return this.sessionModel
      .findOneAndUpdate(
        { sessionId, status: { $ne: 'completed' } as FilterQuery<ConversationSession>['status'] },
        { $set: { status: 'completed', endedAt } },
        { new: true }
      )
      .lean<ConversationSession>()
      .exec();
  }
}
