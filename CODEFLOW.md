# Code Flow and Structure Guide

This document explains how the project is organized and how each API request flows through the codebase.

## 1) High-level architecture

The project follows a layered NestJS architecture:

- `src/main.ts`
  - Application bootstrap
  - Global validation setup
  - Swagger/OpenAPI setup
- `src/app.module.ts`
  - Root dependency composition
  - Database connection (`MongooseModule.forRoot`)
- `src/sessions.module.ts`
  - Feature module for conversation session domain
  - Registers schemas, controller, service, and repositories
- `src/controllers`
  - HTTP route handlers
- `src/services`
  - Business logic and orchestration
- `src/models/dto`
  - Request validation contracts
- `src/models/repositories`
  - Data access logic
- `src/models/schemas`
  - MongoDB schema definitions and indexes

## 2) Runtime startup flow

1. `main.ts` calls `NestFactory.create(AppModule)`.
2. Global `ValidationPipe` is applied:
   - `whitelist: true` removes unknown fields.
   - `transform: true` converts primitive query/body values to typed DTO fields.
   - `forbidNonWhitelisted: true` rejects unexpected fields.
3. Swagger document is created and exposed at `/docs`.
4. HTTP server starts on port `3000`.

## 3) Dependency graph (sessions domain)

Inside `SessionsModule`:

- Controller: `SessionsController`
- Service: `SessionsService`
- Repositories:
  - `SessionsRepository`
  - `EventsRepository`
- Mongoose models:
  - `ConversationSession`
  - `ConversationEvent`

Dependency direction:

`Controller -> Service -> Repositories -> MongoDB`

This keeps transport concerns (HTTP) separate from domain logic and persistence.

## 4) Request flow by endpoint

### A) `POST /sessions`

Goal: create session if missing, else return existing (idempotent).

Flow:
1. `SessionsController.createOrUpsertSession()` receives `CreateSessionDto`.
2. `SessionsService.createOrGetSession()` forwards to repository.
3. `SessionsRepository.createIfMissing()` performs atomic:
   - `findOneAndUpdate({ sessionId }, { $setOnInsert: ... }, { upsert: true, new: true })`
4. Response is either newly inserted session or existing one.

Why idempotent:
- Same `sessionId` repeatedly gives same document.
- Existing session fields are not overwritten because `$setOnInsert` only applies on insert.

### B) `POST /sessions/:sessionId/events`

Goal: append immutable event; duplicate requests should not duplicate data.

Flow:
1. Controller calls `SessionsService.addEvent(sessionId, dto)`.
2. Service checks session exists via `SessionsRepository.findBySessionId`.
3. Service tries `EventsRepository.create(...)`.
4. If Mongo throws duplicate key (`E11000`) on `(sessionId, eventId)`:
   - Service fetches existing event with `findBySessionAndEventId`.
   - Returns existing event with `created: false`.
5. Non-duplicate success returns `{ created: true }`.

Why idempotent:
- Unique compound index guarantees one `eventId` per `sessionId`.
- Retries become safe reads after duplicate-key detection.

### C) `GET /sessions/:sessionId?page=&limit=`

Goal: fetch session + ordered paginated events.

Flow:
1. Controller parses query via `GetSessionQueryDto` (defaults: page=1, limit=50).
2. Service verifies session exists.
3. Service runs in parallel:
   - `EventsRepository.listBySession(sessionId, page, limit)` sorted by `timestamp`.
   - `EventsRepository.countBySession(sessionId)`.
4. Service returns:
   - `session`
   - `events`
   - `pagination` (`page`, `limit`, `totalEvents`, `totalPages`).

### D) `POST /sessions/:sessionId/complete`

Goal: mark session completed once; repeated calls are safe.

Flow:
1. Controller calls `SessionsService.completeSession(sessionId)`.
2. Service calls `SessionsRepository.completeIfNeeded(sessionId, new Date())`.
3. Repository does conditional atomic update:
   - filter: `{ sessionId, status: { $ne: 'completed' } }`
   - update: `{ $set: { status: 'completed', endedAt } }`
4. If update matched nothing, service loads existing session:
   - if found and already completed -> return as-is
   - if missing -> `NotFoundException`

Why idempotent:
- Only first completion call mutates state.
- Later calls return completed state without additional changes.

## 5) MongoDB data model and indexes

### `conversation_sessions`

Fields:
- `sessionId` (unique, indexed)
- `status`
- `language`
- `startedAt`
- `endedAt`
- `metadata`

Index:
- `{ sessionId: 1 } unique`
  - Fast lookup by public key
  - Enforces one session record per external session id

### `conversation_events`

Fields:
- `eventId`
- `sessionId` (indexed)
- `type`
- `payload`
- `timestamp` (indexed)

Indexes:
- `{ sessionId: 1, eventId: 1 } unique`
  - Guarantees event id uniqueness inside session
  - Enables event-write idempotency
- `{ sessionId: 1, timestamp: 1 }`
  - Supports efficient timeline reads with sort + pagination

## 6) Validation and API contracts

DTO validation happens before service execution:

- `CreateSessionDto`: validates required session fields and optional metadata.
- `CreateEventDto`: validates event identity/type/payload/timestamp.
- `GetSessionQueryDto`: validates pagination bounds.

Swagger decorators on DTOs and controller methods produce interactive docs at:

- `http://localhost:3000/docs`

## 7) Error handling behavior

- Missing session on event add / get / complete:
  - `NotFoundException` (HTTP 404)
- Duplicate event writes:
  - Caught in service and converted to safe idempotent response
- Validation errors:
  - Automatically returned as 400 by `ValidationPipe`

## 8) Why this structure is maintainable

- Clear ownership by layer:
  - Controllers: transport only
  - Service: business rules
  - Repositories: persistence behavior
  - Schemas: storage shape/indexes
  - DTOs: input contracts
- Easy to extend:
  - Add new endpoints in controller + service
  - Add new query patterns in repositories
  - Keep behavior consistent with typed DTOs and Swagger docs
