import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ConversationEvent,
  ConversationEventSchema
} from './models/schemas/conversation-event.schema';
import {
  ConversationSession,
  ConversationSessionSchema
} from './models/schemas/conversation-session.schema';
import { EventsRepository } from './models/repositories/events.repository';
import { SessionsRepository } from './models/repositories/sessions.repository';
import { SessionsController } from './controllers/sessions.controller';
import { SessionsService } from './services/sessions.service';

// Feature module for conversation session APIs and persistence dependencies.
@Module({
  imports: [
    // Registers Mongoose models for DI in repositories.
    MongooseModule.forFeature([
      { name: ConversationSession.name, schema: ConversationSessionSchema },
      { name: ConversationEvent.name, schema: ConversationEventSchema }
    ])
  ],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository, EventsRepository]
})
export class SessionsModule {}
