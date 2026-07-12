# AssetFlow Backend

Node.js + Express API for AssetFlow enterprise asset and resource management.

Base URL: `http://localhost:3000/api/v1`

## Prerequisites

- **Node.js** 18+ (20 LTS recommended)
- **PostgreSQL** 14+

## Setup

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET at minimum
npm install
npm run migrate
npm run seed
npm run dev
```

The API listens on the port set in `.env` (default `3000`).

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | Secret for signing JWTs | dev fallback |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |

## Seed credentials

All seeded users share the password **`Password123!`**.

| Role | Email |
|------|-------|
| Admin | `ananya.admin@assetflow.com` |
| Asset Manager | `rahul.manager@assetflow.com` |
| Department Head | `vikram.head@assetflow.com` |
| Employee | `priya@assetflow.com` |

**Double-allocation demo:** asset `AF-0025` (id `25`) is pre-allocated to Priya Shah. Attempting to allocate it again returns `409` with the current holder details.

## Authentication

Protected routes require `Authorization: Bearer <jwt>`.

Error responses use:

```json
{ "error": true, "message": "Human-readable message", "field": "optional_field" }
```

Auth routes are rate-limited to 10 requests per minute per IP.

---

## API surface

### Auth

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/auth/signup` | — | — | Register (role forced to Employee) |
| POST | `/auth/login` | — | — | Login, returns JWT + user |
| GET | `/auth/me` | Bearer | Any | Current user profile |

### Departments

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/departments` | Bearer | Any | List departments |
| POST | `/departments` | Bearer | Admin | Create department |
| PUT | `/departments/:id` | Bearer | Admin | Update department |

### Asset categories

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/asset-categories` | Bearer | Any | List categories |
| POST | `/asset-categories` | Bearer | Admin | Create category |
| PUT | `/asset-categories/:id` | Bearer | Admin | Update category |

### Employees

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/employees` | Bearer | Any | List employees (Admin: all; others: own dept). Paginated: `?page=&limit=` |
| PUT | `/employees/:id/role` | Bearer | Admin | Promote/demote user role |

### Assets

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/assets` | Bearer | Any | Search/filter assets. Paginated: `?page=&limit=`. Filters: `search`, `category_id`, `status`, `department_id`, `location` |
| POST | `/assets` | Bearer | Admin, AssetManager | Register asset (auto-generates `asset_tag`) |
| GET | `/assets/:id` | Bearer | Any | Asset detail + allocation history |
| POST | `/assets/:id/allocate` | Bearer | Admin, AssetManager, DepartmentHead | Allocate to employee |
| POST | `/assets/:id/return` | Bearer | Admin, AssetManager, DepartmentHead | Return active allocation |
| POST | `/assets/:id/transfer-request` | Bearer | Any | Request transfer (current holder only) |

### Transfer requests

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/transfer-requests/:id/approve` | Bearer | Admin, AssetManager, DepartmentHead | Approve or reject (`{ "decision": "Approved" \| "Rejected" }`) |

### Dashboard

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/dashboard/kpis` | Bearer | Any | KPI summary (available, allocated, transfers, returns) |

### Reports

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/reports/utilization` | Bearer | Admin, AssetManager | Assets ranked by allocation activity. `?sort=idle` for least-used first |
| GET | `/reports/department-allocation` | Bearer | Admin, AssetManager | Active allocations per department (includes zero-count depts) |
| GET | `/reports/nearing-retirement` | Bearer | Admin, AssetManager | Assets past age threshold. `?years=N` (default 5) |

---

## Pagination

`GET /assets` and `GET /employees` return:

```json
{
  "data": [ ... ],
  "page": 1,
  "limit": 20,
  "total": 42
}
```

Default `limit` is 20, maximum 100.

---

## Known gaps / in progress

- **`maintenance_today`** and **`active_bookings`** on `GET /dashboard/kpis` are stubbed to `0` — pending integration with Arush's `maintenance_requests` and `bookings` tables on `backend-arush`.
- **`maintenance_history`** on `GET /assets/:id` returns an empty array — same dependency on Arush's maintenance module.
- Bookings, maintenance, audit, notifications, and activity-log endpoints are being built on `backend-arush` and are not available on this branch yet.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with file-watch reload |
| `npm start` | Start production server |
| `npm run migrate` | Run Knex migrations |
| `npm run migrate:rollback` | Roll back last migration batch |
| `npm run seed` | Load demo data |
