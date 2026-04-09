# Conversation Session Service

NestJS backend service for managing Voice AI conversation sessions and events.

## Tech stack

- TypeScript
- NestJS
- MongoDB (via Mongoose)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables (optional):

- `MONGODB_URI` (default: `mongodb://localhost:27017/voice-ai`)

3. Run MongoDB locally or point `MONGODB_URI` to a reachable instance.

## Run the project

Development mode:

```bash
npm run start:dev
```

Build:

```bash
npm run build
```

Start production build:

```bash
npm run start
```

Swagger docs:

- [http://localhost:3000/docs](http://localhost:3000/docs)

Detailed architecture/code flow:

- `CODEFLOW.md`

## API endpoints

- `POST /sessions` - Create or upsert (idempotent create-or-get)
- `POST /sessions/:sessionId/events` - Add immutable event to session
- `GET /sessions/:sessionId?page=1&limit=50` - Fetch session with paginated, ordered events
- `POST /sessions/:sessionId/complete` - Complete session (idempotent)

## Assumptions

- `sessionId` is externally generated and globally unique.
- `eventId` is unique within a session.
- Duplicate event requests are expected and treated idempotently by unique index + duplicate key handling.
- `POST /sessions` returns the existing session if `sessionId` already exists and does not mutate existing values.
