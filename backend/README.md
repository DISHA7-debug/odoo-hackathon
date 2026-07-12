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
