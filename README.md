# Odoo Hackathon 2026

AssetFlow addresses these issues through a single, auditable system with protected workflows and database-level constraints.

---

## Key Features

### Asset Management

- Register assets with automatically generated tags such as `AF-0001`
- Store category, serial number, cost, condition, location, and acquisition details
- Search and filter assets by status, category, department, tag, or location
- View complete allocation and maintenance history
- Manage the complete asset lifecycle

### Allocation and Transfer

- Allocate assets to employees or departments
- Prevent more than one active allocation for the same asset
- Display the current holder when an allocation conflict occurs
- Offer a transfer request instead of allowing duplicate allocation
- Process returns with condition check-in notes
- Track expected and actual return dates

### Resource Booking

- Mark selected assets as shared and bookable
- View bookings through a calendar-style interface
- Block overlapping bookings at the service layer
- Allow adjacent bookings, such as `09:00–10:00` followed by `10:00–11:00`
- Cancel and track upcoming, ongoing, completed, and cancelled bookings

### Maintenance Management

- Raise maintenance requests with priority and issue details
- Require approval before changing an asset to `Under Maintenance`
- Assign technicians and monitor repair progress
- Follow a controlled workflow:

```text
Pending → Approved/Rejected → Technician Assigned → In Progress → Resolved
```

- Return resolved assets to the correct available state

### Asset Audits

- Create audit cycles by department, location, and date range
- Assign auditors
- Record each asset as `Verified`, `Missing`, or `Damaged`
- Automatically generate discrepancy reports
- Lock completed audit cycles
- Mark confirmed missing assets as `Lost`

### Dashboard and Reports

- Assets available and allocated
- Active bookings
- Maintenance activity
- Pending transfer requests
- Upcoming and overdue returns
- Asset utilization trends
- Maintenance frequency by category
- Department-wise allocation
- Resource-booking heatmaps

### Notifications and Activity Logs

- User-specific notifications
- Unread notification count
- Automatic alerts for overdue returns, bookings, and maintenance
- Auditable records of important user and system actions
- Filterable organization-wide activity history for administrators

---

## User Roles

| Role | Permissions |
|---|---|
| **Admin** | Manage departments, categories, employees, audit cycles, user roles, and organization-wide analytics |
| **Asset Manager** | Register and allocate assets; approve transfers, maintenance, audit discrepancies, and returns |
| **Department Head** | View departmental assets, approve departmental requests, and book shared resources |
| **Employee** | View assigned assets, book resources, request maintenance, and initiate returns or transfers |

> New users are always registered as **Employees**. Roles can only be changed by an Admin from the Employee Directory.

---

## Core Business Rules

AssetFlow protects critical operations through both service-layer validation and database constraints.

1. **No role selection during signup**  
   The backend always creates new accounts with the `Employee` role.

2. **No double allocation**  
   An asset can have only one active allocation. A partial unique PostgreSQL index enforces this rule.

3. **No overlapping bookings**  
   A booking is rejected when its time range overlaps an active booking for the same resource.

4. **Controlled asset status transitions**  
   Asset statuses are updated through one centralized status-transition service.

5. **Maintenance approval is mandatory**  
   An asset becomes `Under Maintenance` only after a maintenance request is approved.

6. **Audit closure is irreversible**  
   Closing an audit locks its findings and updates relevant asset states.

7. **Overdue values are computed automatically**  
   Overdue returns, bookings, and maintenance requests are derived from dates instead of being manually assigned.

---

## Asset Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Available
    Available --> Allocated: Successful allocation
    Available --> Reserved: Resource booking
    Available --> UnderMaintenance: Maintenance approved
    Allocated --> UnderMaintenance: Maintenance approved
    Allocated --> Available: Return processed
    UnderMaintenance --> Available: Maintenance resolved
    Available --> Lost: Confirmed missing after audit
    Available --> Retired: Manager action
    Allocated --> Retired: Manager action
    Retired --> Disposed: Disposal approved
```

Supported asset states:

```text
Available
Allocated
Reserved
Under Maintenance
Lost
Retired
Disposed
```

---

## System Workflow

```mermaid
flowchart LR
    A[Admin creates departments and categories] --> B[Admin assigns organizational roles]
    B --> C[Asset Manager registers assets]
    C --> D{Asset action}
    D -->|Allocate| E[Allocation validation]
    D -->|Book| F[Booking overlap validation]
    D -->|Repair| G[Maintenance approval workflow]
    E --> H[Allocated asset]
    F --> I[Reserved shared resource]
    G --> J[Under Maintenance]
    J --> K[Resolved and Available]
    H --> L[Return or Transfer]
    I --> M[Booking completed or cancelled]
    C --> N[Audit cycle]
    N --> O[Verified, Missing, or Damaged]
    O --> P[Discrepancy report and status updates]
    H --> Q[Dashboard, Notifications, Reports]
    I --> Q
    K --> Q
    P --> Q
```

---

## Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Responsive dashboard layout
- Reusable tables, forms, modals, badges, toasts, and navigation components

### Backend

- Node.js
- Express.js
- REST API architecture
- JWT authentication
- bcrypt password hashing
- Schema-based request validation
- Modular routes, middleware, and services

### Database

- PostgreSQL
- Relational schema with foreign keys
- Check constraints for controlled enum values
- Partial unique indexes
- Indexed booking and reporting queries
- JSONB support for category-specific custom fields

### Development

- Git and GitHub
- Environment-based configuration
- Branch-based team workflow
- Conventional commit messages

---

## Database Design

The main database entities are:

- `departments`
- `users`
- `asset_categories`
- `assets`
- `asset_allocations`
- `transfer_requests`
- `bookings`
- `maintenance_requests`
- `audit_cycles`
- `audit_assignments`
- `audit_findings`
- `notifications`
- `activity_logs`

### Relationship Summary

```text
departments       1 ─── N users
departments       1 ─── N child departments
asset_categories  1 ─── N assets
assets            1 ─── N asset_allocations
assets            1 ─── N transfer_requests
assets            1 ─── N bookings
assets            1 ─── N maintenance_requests
assets            1 ─── N audit_findings
audit_cycles      1 ─── N audit_assignments
audit_cycles      1 ─── N audit_findings
users             1 ─── N notifications
users             1 ─── N activity_logs
```

A PostgreSQL partial unique index ensures that an asset cannot have more than one active allocation:

```sql
CREATE UNIQUE INDEX one_active_allocation_per_asset
ON asset_allocations(asset_id)
WHERE status = 'Active';
```

---

## Project Structure

```text
AssetFlow/
├── backend/
│   ├── src/
│   │   ├── config/              # Database and environment configuration
│   │   ├── middleware/          # Authentication, role checks, validation, errors
│   │   ├── routes/              # REST API routes
│   │   ├── services/            # Business rules and lifecycle logic
│   │   ├── models/              # Database models or query modules
│   │   └── utils/               # Notifications, logging, and helpers
│   ├── migrations/              # PostgreSQL migrations
│   ├── seed.js                  # Demo and development seed data
│   ├── .env.example
│   └── package.json
│
├── Frontend/
│   ├── index.html               # Entry point
│   ├── assets/                  # Images, icons, and fonts
│   ├── css/                     # Shared and page-specific styles
│   ├── js/                      # API integration and UI logic
│   ├── dashboard/
│   ├── assets/
│   ├── allocations/
│   ├── bookings/
│   ├── maintenance/
│   ├── audits/
│   ├── reports/
│   ├── approvals/
│   └── notifications/
│
├── docs/
│   ├── DATABASE_SCHEMA.md
│   ├── API_CONTRACT.md
│   ├── BACKEND_GUIDE.md
│   ├── FRONTEND_GUIDE.md
│   ├── ROADMAP.md
│   └── GIT_WORKFLOW.md
│
├── .gitignore
└── README.md
```

> Adjust the folder tree above if your final repository uses different filenames.

---

## Getting Started

### Prerequisites

Install the following:

- Node.js 18 or later
- npm
- PostgreSQL 14 or later
- Git
- A modern web browser

---

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AssetFlow
```

---

### 2. Create the PostgreSQL Database

Using the PostgreSQL command line:

```sql
CREATE DATABASE assetflow;
```

Or from a terminal:

```bash
createdb assetflow
```

---

### 3. Configure the Backend

```bash
cd backend
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Example `.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/assetflow
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://127.0.0.1:5500
```

Never commit the real `.env` file.

---

### 4. Run Migrations and Seed Data

```bash
npm run migrate
npm run seed
```

The seed data should include:

- One Admin
- Asset Managers and Department Heads
- Employees across multiple departments
- Asset categories and sample assets
- One active allocation for conflict testing
- One active booking for overlap testing

> Use the equivalent migration and seed commands defined in your `package.json` if the script names differ.

---

### 5. Start the Backend

```bash
npm run dev
```

The API should be available at:

```text
http://localhost:5000/api/v1
```

---

### 6. Start the Frontend

Open the `Frontend` folder with VS Code Live Server, or run:

```bash
cd ../Frontend
python -m http.server 5500
```

Then open:

```text
http://127.0.0.1:5500/index.html
```

Make sure the frontend API base URL points to:

```text
http://localhost:5000/api/v1
```

---

## API Overview

All authenticated endpoints expect:

```http
Authorization: Bearer <jwt>
```

Base path:

```text
/api/v1
```

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register a new Employee account |
| `POST` | `/auth/login` | Authenticate and receive a JWT |
| `GET` | `/auth/me` | Return the authenticated user |

### Organization

| Method | Endpoint | Description |
|---|---|---|
| `GET/POST/PUT` | `/departments` | Manage departments |
| `GET/POST/PUT` | `/asset-categories` | Manage asset categories |
| `GET` | `/employees` | View employee directory |
| `PUT` | `/employees/:id/role` | Change a user's role as Admin |

### Assets and Allocation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/assets` | Search and filter assets |
| `POST` | `/assets` | Register a new asset |
| `GET` | `/assets/:id` | View asset details and history |
| `POST` | `/assets/:id/allocate` | Allocate an available asset |
| `POST` | `/assets/:id/return` | Process an asset return |
| `POST` | `/assets/:id/transfer-request` | Request an asset transfer |
| `POST` | `/transfer-requests/:id/approve` | Approve or reject a transfer |

### Bookings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/bookings` | View bookings |
| `POST` | `/bookings` | Create a conflict-checked booking |
| `POST` | `/bookings/:id/cancel` | Cancel a booking |

### Maintenance

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/maintenance-requests` | List maintenance requests |
| `POST` | `/maintenance-requests` | Raise a maintenance request |
| `PUT` | `/maintenance-requests/:id/status` | Progress the maintenance workflow |

### Audits

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/audit-cycles` | Create an audit cycle |
| `POST` | `/audit-cycles/:id/assign-auditor` | Assign an auditor |
| `POST` | `/audit-cycles/:id/findings` | Record asset findings |
| `POST` | `/audit-cycles/:id/close` | Close and lock the audit |

### Dashboard, Reports, and Logs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard/kpis` | Fetch dashboard metrics and overdue items |
| `GET` | `/reports/utilization` | View asset utilization |
| `GET` | `/reports/maintenance-frequency` | View maintenance trends |
| `GET` | `/reports/department-allocation` | View departmental allocation |
| `GET` | `/reports/booking-heatmap` | View booking activity |
| `GET` | `/notifications` | View current-user notifications |
| `PUT` | `/notifications/:id/read` | Mark a notification as read |
| `GET` | `/activity-logs` | View auditable activity logs |

---

## Standard Error Format

All API errors follow a consistent response shape:

```json
{
  "error": true,
  "message": "Human-readable error message",
  "field": "email"
}
```

Examples include:

- Invalid email format
- Duplicate email
- Invalid status transition
- Missing referenced employee or category
- Booking overlap
- Existing asset allocation
- Unauthorized role
- Expired or invalid authentication token

---

## Validation and Security

- Passwords are hashed with bcrypt.
- Authentication uses signed JWTs.
- Public signup never accepts a role.
- Every protected route validates authentication.
- Mutating routes enforce role-based authorization.
- SQL queries use parameterized values.
- Foreign-key references are validated before inserts.
- Enumerated values are validated in both the API and database.
- Expected return dates cannot be in the past.
- Booking end time must be later than start time.
- Internal database errors are not exposed to clients.
- Secrets and environment files are excluded from version control.
- Important state changes create activity-log entries.

---

## Main Screens

1. Login and Signup
2. Dashboard
3. Organization Setup
4. Asset Registration and Directory
5. Asset Allocation and Transfer
6. Resource Booking
7. Maintenance Management
8. Asset Audit
9. Reports and Analytics
10. Activity Logs and Notifications

The interface uses role-aware navigation, reusable status badges, responsive tables, inline validation, loading states, empty states, confirmation dialogs, and success/error toasts.

---

## Demo Flow

A complete demonstration can be presented in the following order:

1. Log in as Admin and promote an Employee to Asset Manager.
2. Log in as Asset Manager and register a new asset.
3. Allocate the asset to Employee A.
4. Attempt to allocate the same asset to Employee B.
5. Show the conflict message and create a transfer request.
6. Book a shared resource.
7. Attempt an overlapping booking and show the rejection.
8. Raise a maintenance request as an Employee.
9. Approve it as an Asset Manager and show the asset move to `Under Maintenance`.
10. Resolve the request and show the asset return to `Available`.
11. Create an audit cycle and assign an auditor.
12. Mark an asset as missing and close the cycle.
13. Show the asset move to `Lost`.
14. Show updated dashboard KPIs, notifications, logs, and reports.

---

## Team

| Member | Responsibility |
|---|---|
| **Disha** | Backend lead, database schema, authentication, organization setup, assets, allocation, transfers |
| **Arush** | Bookings, maintenance, audits, notifications, activity logs, reports |
| **Drishti** | Frontend screens, reusable components, UI/UX consistency, responsive design |

---

## Git Workflow

Main branches:

```text
main
backend-disha
backend-arush
frontend-drishti
```

Recommended commit format:

```text
feat: add booking overlap validation
fix: prevent duplicate active allocation
refactor: move asset transitions into service
docs: update backend setup
chore: configure environment variables
```

Development rules:

- Commit small, working changes.
- Open pull requests regularly.
- Keep `main` deployable.
- Pull the latest `main` after every merge.
- Never commit `.env`, credentials, or database secrets.
- Ensure all team members have visible commit history.

---

## Future Enhancements

- QR and barcode-based asset scanning
- Email and push notification delivery
- Cloud deployment and managed PostgreSQL
- Advanced asset depreciation reports
- Predictive maintenance analytics
- Multi-organization tenancy
- Mobile application
- SSO and enterprise identity integration
- Automated report scheduling
- Fine-grained custom permissions

---

## Contributing

1. Create a feature branch from `main`.
2. Make focused changes.
3. Test happy paths, validation failures, and permission failures.
4. Use a conventional commit message.
5. Push the branch and open a pull request.
6. Request review before merging.

---

## License

This project was developed for the **Odoo Hiring Hackathon**. Add the appropriate open-source license before public distribution.

---

<p align="center">
  Built with teamwork, structured workflows, and reliable relational data.
</p>
