# AssetFlow — Backend Guide

## Suggested stack
- **Runtime**: Node.js + Express (fastest to scaffold for a 2-person backend split), OR FastAPI if you're both more fluent in Python. Pick ONE before hour 0 — don't let this be a live debate.
- **DB**: PostgreSQL, accessed via a query builder or lightweight ORM (Knex/Prisma for Node, SQLAlchemy for Python). Avoid a full heavyweight ORM if it slows you down — raw parameterized SQL is fine and arguably better for showing you understand the DB.
- **Auth**: JWT, bcrypt for password hashing.
- **Validation**: a schema validation library (Zod/Joi for Node, Pydantic for FastAPI) — don't hand-roll every check, but DO make sure every validator produces a specific, human-readable error tied to a field.

## Folder structure (suggested)
```
backend/
  src/
    config/          (db connection, env)
    models/           or  db/migrations/
    services/         <- business logic lives here (state machine, overlap checks)
    routes/           <- thin HTTP layer, calls services
    middleware/        (auth, role-check, error handler, validation)
    utils/
  migrations/
  seed.js / seed.py
  .env.example
```

**Why services/ matters for scoring**: routes should be thin (parse request →
call service → return response). All business logic (allocation conflict
check, overlap check, state transitions) lives in `services/`, testable and
reusable. This is literally the "modularity" criterion.

## Module ownership

### Disha owns:
- `auth` (signup/login/JWT/session)
- `departments`, `asset-categories`, `employees` (Org Setup)
- `assets` (registration, search, detail, history)
- `allocations` + `transfer-requests` (the conflict-handling core)
- Central `assetStatusService.transition(assetId, newStatus, ...)` — **Arush's
  maintenance/booking modules call this, not their own status updates.**
  Agree on this function's signature in hour 1 so nobody duplicates logic.

### Arush owns:
- `bookings` (overlap validation, calendar queries, status lifecycle)
- `maintenance-requests` (approval workflow, technician assignment)
- `audit-cycles`, `audit-assignments`, `audit-findings`
- `notifications` (triggered from events in both Disha's and Arush's modules —
  simplest approach: a shared `notify(userId, type, message)` helper anyone can call)
- `activity-logs` (same idea — a shared `logActivity(userId, action, entity...)` helper)
- `/reports/*` endpoints (mostly aggregate SQL queries)

## Middleware everyone uses
```js
requireAuth        // validates JWT, attaches req.user
requireRole(['Admin', 'AssetManager'])  // 403 if req.user.role not in list
validateBody(schema)  // 400 with field-level errors on failure
errorHandler        // catches thrown errors, formats consistent { error, message, field } response
```
Write `requireAuth`, `requireRole`, and `errorHandler` ONCE in hour 1 (Disha),
share immediately — both of you build routes on top of the same middleware
from the start so error responses are consistent across the whole API.

## Validation checklist (apply per endpoint, not just at the edges)
- Every enum field checked against allowed values
- Every date field checked for valid format + logical constraints (no past
  expected-return-dates, end > start on bookings)
- Every FK checked to exist before insert (category_id, department_id, etc.)
- Email format validated server-side on signup (don't rely on frontend alone)
- Password minimum length/complexity, never returned in any response
- Role-based access enforced on every mutating endpoint, not just hidden in UI

## Seed data (build this together, hour 1, so it's ready for testing all day)
Suggested realistic dataset:
- 1 Admin, 2 Asset Managers, 2 Department Heads, ~10 Employees
- 3 departments (Engineering, Operations, HR), one with a parent/child relationship
- 4 asset categories (Electronics, Furniture, Vehicles, Meeting Rooms)
- ~25 assets across categories, a few pre-allocated, 2-3 marked bookable
- 1 pre-existing active allocation set up specifically to demo the "already
  held" conflict block live
- 1 pre-existing booking set up to demo overlap rejection live

## Testing your own modules before integration
For every module, manually verify:
1. Happy path works
2. The specific blocking rule works (double-allocation / overlap / unapproved maintenance start)
3. Invalid input returns a clear 400, not a stack trace
4. Wrong role gets 403, not a silent 200
