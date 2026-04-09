import { Injectable, NotFoundException } from '@nestjs/common';
import { MongoServerError } from 'mongodb';
import { CreateEventDto } from '../models/dto/create-event.dto';
import { CreateSessionDto } from '../models/dto/create-session.dto';
import { EventsRepository } from '../models/repositories/events.repository';
import { SessionsRepository } from '../models/repositories/sessions.repository';
import { ConversationEvent } from '../models/schemas/conversation-event.schema';
import { ConversationSession } from '../models/schemas/conversation-session.schema';

// Business layer: orchestrates validations, idempotency, and read models.
@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly eventsRepository: EventsRepository
  ) {}

  async createOrGetSession(dto: CreateSessionDto): Promise<ConversationSession> {
    // Repository uses atomic upsert + $setOnInsert for idempotent creation.
    return this.sessionsRepository.createIfMissing({
      sessionId: dto.sessionId,
      status: dto.status,
      language: dto.language,
      startedAt: dto.startedAt,
      endedAt: dto.endedAt,
      metadata: dto.metadata
    });
  }

  async addEvent(
    sessionId: string,
    dto: CreateEventDto
  ): Promise<{ event: ConversationEvent; created: boolean }> {
    // Enforce parent existence before accepting events.
    const session = await this.sessionsRepository.findBySessionId(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    try {
      const createdEvent = await this.eventsRepository.create({
        sessionId,
        eventId: dto.eventId,
        type: dto.type,
        payload: dto.payload,
        timestamp: dto.timestamp
      });
      return { event: createdEvent, created: true };
    } catch (error: unknown) {
      // Duplicate key means event already exists (idempotent retry).
      if (error instanceof MongoServerError && error.code === 11000) {
        const existing = await this.eventsRepository.findBySessionAndEventId(sessionId, dto.eventId);
        if (!existing) {
          throw error;
        }
        return { event: existing, created: false };
      }
      throw error;
    }
  }

  async getSessionWithEvents(sessionId: string, page: number, limit: number) {
    // Return 404 for unknown session; events are queried only for valid parent.
    const session = await this.sessionsRepository.findBySessionId(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const [events, totalEvents] = await Promise.all([
      this.eventsRepository.listBySession(sessionId, page, limit),
      this.eventsRepository.countBySession(sessionId)
    ]);

    return {
      session,
      events,
      pagination: {
        page,
        limit,
        totalEvents,
        totalPages: Math.ceil(totalEvents / limit)
      }
    };
  }

  async completeSession(sessionId: string): Promise<ConversationSession> {
    // Attempt state transition once; if already completed, fetch existing.
    const completedNow = await this.sessionsRepository.completeIfNeeded(sessionId, new Date());
    if (completedNow) {
      return completedNow;
    }

    const existing = await this.sessionsRepository.findBySessionId(sessionId);
    if (!existing) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return existing;
  }
}
