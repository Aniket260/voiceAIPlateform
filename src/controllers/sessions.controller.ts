import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags
} from '@nestjs/swagger';
import { CreateEventDto } from '../models/dto/create-event.dto';
import { CreateSessionDto } from '../models/dto/create-session.dto';
import { GetSessionQueryDto } from '../models/dto/get-session-query.dto';
import { SessionsService } from '../services/sessions.service';

// HTTP layer: receives requests, validates DTOs, and delegates business logic.
@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @ApiOperation({ summary: 'Create or return existing session (idempotent)' })
  @ApiBody({ type: CreateSessionDto })
  @ApiOkResponse({ description: 'Created or existing session returned' })
  @Post()
  async createOrUpsertSession(@Body() dto: CreateSessionDto) {
    // Idempotent create-or-get behavior is handled in the service/repository.
    return this.sessionsService.createOrGetSession(dto);
  }

  @ApiOperation({ summary: 'Add event to a session (idempotent by eventId per session)' })
  @ApiParam({ name: 'sessionId', example: 'sess_1001' })
  @ApiBody({ type: CreateEventDto })
  @ApiOkResponse({ description: 'Event inserted or existing event returned' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @Post(':sessionId/events')
  async addEvent(@Param('sessionId') sessionId: string, @Body() dto: CreateEventDto) {
    // Inserts immutable event or returns existing one on duplicate eventId.
    return this.sessionsService.addEvent(sessionId, dto);
  }

  @ApiOperation({ summary: 'Get session details with paginated events' })
  @ApiParam({ name: 'sessionId', example: 'sess_1001' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiOkResponse({ description: 'Session with ordered events returned' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @Get(':sessionId')
  async getSession(
    @Param('sessionId') sessionId: string,
    @Query() query: GetSessionQueryDto
  ) {
    // Query params are optional and defaulted for predictable pagination.
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    return this.sessionsService.getSessionWithEvents(sessionId, page, limit);
  }

  @ApiOperation({ summary: 'Mark session as completed (idempotent)' })
  @ApiParam({ name: 'sessionId', example: 'sess_1001' })
  @ApiOkResponse({ description: 'Completed or already completed session returned' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @Post(':sessionId/complete')
  async completeSession(@Param('sessionId') sessionId: string) {
    // Safe to call repeatedly; completion is idempotent.
    return this.sessionsService.completeSession(sessionId);
  }
}
