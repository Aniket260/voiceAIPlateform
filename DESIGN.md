# Design Notes

## 1) How idempotency is ensured

- **Create/Upsert session (`POST /sessions`)** uses `findOneAndUpdate` with `upsert: true` and `$setOnInsert`, so repeated requests for the same `sessionId` return the same record without changing existing data.
- **Add event (`POST /sessions/:sessionId/events`)** uses a unique compound index `(sessionId, eventId)`. If a duplicate arrives, MongoDB throws duplicate key (`11000`) and the service returns the already existing event.
- **Complete session (`POST /sessions/:sessionId/complete`)** updates status only when status is not `completed`; repeated calls return the same completed session.

## 2) Behavior under concurrent requests

- Concurrency safety relies on **atomic single-document operations** in MongoDB (`findOneAndUpdate`) and **unique indexes**.
- If multiple calls attempt to create the same session at once, only one insert can happen; others read the existing session.
- If multiple calls add the same event concurrently, only one insert succeeds; others hit duplicate key and read existing immutable event.
- Completion requests race safely: first write sets `completed` + `endedAt`, later calls return existing session unchanged.

## 3) MongoDB indexes chosen and why

- `conversation_sessions.sessionId` unique index:
  - Guarantees one session per external `sessionId`.
  - Supports fast lookup by primary API key.
- `conversation_events` compound unique index on `(sessionId, eventId)`:
  - Enforces per-session event uniqueness and idempotency.
- `conversation_events` index on `(sessionId, timestamp)`:
  - Supports efficient event listing sorted by timestamp with pagination.

## 4) Scaling to millions of sessions/day

- Use **sharding** with a suitable shard key (e.g. hashed `sessionId`) to distribute write/read load.
- Keep writes append-oriented and immutable where possible (events already immutable).
- Use connection pooling and horizontal scale-out of stateless NestJS instances.
- Add read replicas for heavy read traffic and tune indexes around query patterns.
- Introduce archival/retention strategy (TTL or cold storage pipeline) based on business requirements.

## 5) Intentionally out of scope

- Authentication/authorization (explicitly excluded).
- Background processing, queues, analytics fan-out (explicitly excluded).
- Advanced lifecycle rules (status transition validation/state machine).
- Cross-region replication/failover policies and observability stack details.

These were omitted to keep the solution simple, focused, and correct for core API behavior.
