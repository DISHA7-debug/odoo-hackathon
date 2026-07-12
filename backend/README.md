# AssetFlow Backend API

AssetFlow is an enterprise asset and shared resource management backend built with Node.js, Express, PostgreSQL, and Knex.js.

## Technology Stack
- **Runtime & Framework**: Node.js + Express
- **Database**: PostgreSQL (accessed via Knex.js query builder)
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Schema Validation**: Zod
- **Security & Headers**: Helmet & CORS middleware

---

## Directory Structure
```
backend/
├── src/
│   ├── config/          # Database and environment configurations
│   ├── db/              # Knex migrations and setup
│   ├── middleware/      # Authentication, role enforcement, validation, and error handlers
│   ├── routes/          # Express route controllers
│   ├── services/        # Business logic, status state transitions, and database queries
│   └── utils/           # Validation schemas and helper utilities
├── scripts/             # Unit, integration, and end-to-end verification scripts
├── knexfile.js          # Knex database configuration
├── seed.js              # Database seed script populating mock records
├── package.json         # Package configuration and script shortcuts
└── README.md            # Backend developer documentation (this file)
```

---

## Quick Start & Setup Instructions

Ensure PostgreSQL is running locally and a database named `assetflow` exists before starting.

1. **Configure Environment Variables**
   Copy the example environment configuration file and adjust variables as needed:
   ```bash
   cp .env.example .env
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run Database Migrations**
   Apply database schema migrations to the PostgreSQL database:
   ```bash
   npm run migrate
   ```

4. **Seed the Database**
   Populate the database with realistic organizations, employees, categories, assets, bookings, and audit cycles:
   ```bash
   npm run seed
   ```

5. **Start the API Server**
   Start the Express server in development mode with watch auto-reload:
   ```bash
   npm run dev
   ```
   The API will listen on port `3000` (e.g. `http://localhost:3000/api/v1`).

---

## Seed Credentials

All seeded users share the password **`Password123!`**.

| Role | Email |
|------|-------|
| Admin | `ananya.admin@assetflow.com` |
| Asset Manager | `rahul.manager@assetflow.com` |
| Department Head | `vikram.head@assetflow.com` |
| Employee | `priya@assetflow.com` |

**Double-allocation demo:** Asset `AF-0025` is pre-allocated to Priya Shah. Attempting to allocate it again returns `409` with the current holder details.

---

## Authentication & Error shape

Protected routes require `Authorization: Bearer <jwt>`.

Error responses use:
```json
{ "error": true, "message": "Human-readable message", "field": "optional_field" }
```

Auth routes are rate-limited to 10 requests per minute per IP.

---

## API Surface

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

### Asset Categories
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
| GET | `/assets/:id` | Bearer | Any | Asset detail + allocation history + maintenance history |
| GET | `/assets/:id/detail` | Bearer | Any | Alias for asset detail |
| POST | `/assets/:id/allocate` | Bearer | Admin, AssetManager, DepartmentHead | Allocate to employee |
| POST | `/assets/:id/return` | Bearer | Admin, AssetManager, DepartmentHead | Return active allocation |
| POST | `/assets/:id/transfer-request` | Bearer | Any | Request transfer (current holder only) |

### Transfer Requests
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/transfer-requests/:id/approve` | Bearer | Admin, AssetManager, DepartmentHead | Approve or reject (`{ "decision": "Approved" \| "Rejected" }`) |

### Dashboard
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/dashboard/kpis` | Bearer | Any | KPI summary (available, allocated, transfers, returns, maintenance, active bookings) |

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

## Testing & Verification

The backend includes a comprehensive test suite to guarantee reliability.

### 1. End-to-End Integration Verification
Run the comprehensive 18-step integration test flow simulating employee promotion, asset creation, double-allocation rejection, transfer requests and approval, overlapping resource bookings, maintenance lifecycle transitions, audit cycle workflows, dashboard KPIs consistency, notification dispatching, and activity logs tracking:
```bash
node scripts/e2e-integration-test.js
```
*Note: All 30 checks (integration steps, role-based access enforcement, and error response shape consistency) pass successfully.*

### 2. Specialized Workflow Tests
We maintain localized workflow scripts inside the `scripts/` directory:
- **Booking Overlap Constraint**: Validates database exclusion constraints blocking duplicate/overlapping resource bookings.
  ```bash
  npm run test:booking-overlap
  ```
- **Maintenance Lifecycle**: Asserts state transitions (`Available` ⟷ `Under Maintenance`), technician assignment rules, and database transaction rollbacks on failure.
  ```bash
  npm run test:maintenance-workflow
  ```
- **Audit Findings Enforcements**: Verifies that only assigned auditors or administrators can submit findings.
  ```bash
  npm run test:audit-findings
  ```

---

## Status & Completion Summary
- **Maintenance History Integration**: The `GET /api/v1/assets/:id` (and `/api/v1/assets/:id/detail`) endpoint returns the complete maintenance history (joined from `maintenance_requests`) ordered by date descending, alongside the allocation history.
- **Dashboard KPIs**: Dashboard metrics are fully implemented and reflect active bookings, allocation counts, and current maintenance requests accurately.
- **Known Gaps**: **None.** The backend is fully completed, verified, and ready for frontend integration.
