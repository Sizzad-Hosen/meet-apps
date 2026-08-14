# Backend Architecture

This backend uses a feature-first structure. Each feature owns its routes, request validation, controller, and business service. Shared infrastructure is kept outside feature folders so business code does not depend on Express details or duplicate cross-cutting behavior.

## Request flow

```text
HTTP request
  -> global security/rate-limit middleware
  -> route validation and authentication
  -> controller
  -> service
  -> Prisma / LiveKit / S3 / email
  -> standard response or global error handler
```

Controllers translate HTTP input and output. Services enforce authorization and business rules. Validation files define the public request contract. External integrations are isolated behind helpers or feature adapters.

## Source layout

```text
src/
  app/
    config/                 Environment parsing and typed configuration
    errors/                 Operational application errors
    middlewares/            Authentication, validation, logging, errors
    modules/
      Auth/                 Registration, login, refresh and password reset
      Meetings/             Meeting lifecycle, waiting room and moderation
      Breakout/             Breakout rooms and broadcasts
      Polls/                Poll creation, voting and results
      ScreenShare/          Screen-share request and approval state
      Record/               LiveKit recording and S3 access
      LiveKit/              LiveKit tokens and webhook endpoints
    routes/                 API route composition
    sockets/                Authenticated Socket.IO room membership
  helpers/                  JWT, email, S3 and LiveKit primitives
  lib/                      Long-lived infrastructure clients
  shared/                   Framework-wide response, error and logging helpers
```

## Module responsibilities

| Module | Owns | Important rule |
| --- | --- | --- |
| Auth | Accounts and JWT sessions | Password reset uses a signed, expiring token; passwords never leave the service |
| Meetings | Meeting state and participant admission | Only admitted participants receive LiveKit access tokens |
| Breakout | Breakout room assignment and messages | Membership and moderator access are verified in the service |
| Polls | Poll lifecycle, options and votes | Callers must be admitted meeting participants |
| ScreenShare | Request/approve/deny state | Meeting screen-share policy is enforced server-side |
| Record | Egress recording and stored files | LiveKit and S3 failures remain operational errors |
| LiveKit | Media access and webhooks | The webhook route receives the raw body before JSON parsing |

`Meetings/meetings.media.ts` is the integration boundary for meeting-specific LiveKit operations. `Meetings/meetings.service.ts` owns database state, access control, and orchestration. There is deliberately only one meeting service implementation.

## Dependency rules

- Routes may import controllers, validation schemas, and middleware.
- Controllers may import services and shared HTTP helpers.
- Services may import Prisma, configuration, domain helpers, and integration adapters.
- Services must not read `Request` or write `Response` objects.
- Validation schemas are the source of request input types.
- Environment variables are read only by `app/config`; application code consumes typed configuration.
- Expected failures use `ApiError`; controllers do not replace them with generic 500 responses.
- Database changes spanning multiple related records use Prisma transactions.

## Meeting admission lifecycle

```text
join request
  -> waiting (when waiting room is enabled)
  -> host admits participant
  -> admitted in database
  -> participant requests their own LiveKit token
  -> connected to the shared LiveKit room
  -> left / kicked / meeting ended
```

Admission never sends a participant token to the host. The admitted participant requests a short-lived token using their own authenticated session. This prevents token disclosure and supports many participants joining the same meeting safely.

## Adding a module

Create a feature directory with these files when applicable:

```text
Feature/
  feature.validation.ts
  feature.service.ts
  feature.controller.ts
  feature.route.ts
```

Then register its router in `app/routes/index.ts`. Keep data access and authorization in the service, use `catchAsync` in the controller, validate every external input with Zod, and return responses through `sendResponse`.

## Verification

```bash
npm run build
npm run test:unit
npm run test:integration
```

Unit tests cover schemas and shared helpers. Integration tests cover middleware, routing, response shapes, and error propagation. Database/LiveKit end-to-end tests should run against isolated test infrastructure and must not use production credentials.
