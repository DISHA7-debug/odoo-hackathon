# AssetFlow — Database Schema (PostgreSQL)

Owner: Disha. This is the highest-weighted eval criterion — get relationships
and constraints right before writing a single API route.

## ER overview (text form)

```
departments 1---N users
departments 1---N departments (self-ref, parent_department_id)
asset_categories 1---N assets
users 1---N assets (via allocations)
assets 1---N asset_allocations
assets 1---N transfer_requests
assets 1---N bookings (when is_bookable = true)
assets 1---N maintenance_requests
assets 1---N audit_findings
audit_cycles 1---N audit_assignments
audit_cycles 1---N audit_findings
users 1---N notifications
users 1---N activity_logs
```

## Tables

### departments
```sql
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  head_user_id INTEGER REFERENCES users(id),
  parent_department_id INTEGER REFERENCES departments(id),
  status VARCHAR(10) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  created_at TIMESTAMP DEFAULT now()
);
```
Note: `head_user_id` references `users`, `users` references `departments` —
create `departments` first without FK, or use `ALTER TABLE` after both exist,
or make `department_id` on users nullable and add FK after.

### users
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'Employee'
       CHECK (role IN ('Admin','AssetManager','DepartmentHead','Employee')),
  department_id INTEGER REFERENCES departments(id),
  status VARCHAR(10) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  created_at TIMESTAMP DEFAULT now()
);
```
- Signup endpoint inserts with `role = 'Employee'` hardcoded server-side.
  Never trust a client-supplied role on this table via the public API.
- Seed one `Admin` manually / via seed script — never via public signup.

### asset_categories
```sql
CREATE TABLE asset_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  custom_fields JSONB DEFAULT '{}',  -- e.g. {"warranty_period_months": 24}
  created_at TIMESTAMP DEFAULT now()
);
```

### assets
```sql
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  category_id INTEGER NOT NULL REFERENCES asset_categories(id),
  asset_tag VARCHAR(20) NOT NULL UNIQUE,        -- auto-generated e.g. AF-0001
  serial_number VARCHAR(80),
  acquisition_date DATE,
  acquisition_cost NUMERIC(12,2),
  condition VARCHAR(20) DEFAULT 'Good' CHECK (condition IN ('New','Good','Fair','Poor','Damaged')),
  location VARCHAR(160),
  photo_url TEXT,
  is_bookable BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'Available'
    CHECK (status IN ('Available','Allocated','Reserved','Under Maintenance','Lost','Retired','Disposed')),
  created_at TIMESTAMP DEFAULT now()
);
```
- `asset_tag` generation: `AF-` + zero-padded sequence, done server-side on insert.

### asset_allocations
```sql
CREATE TABLE asset_allocations (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  employee_id INTEGER REFERENCES users(id),
  department_id INTEGER REFERENCES departments(id),
  allocated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  condition_checkin_notes TEXT,
  status VARCHAR(10) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Returned','Overdue')),
  created_at TIMESTAMP DEFAULT now()
);
-- Enforce at most one Active allocation per asset:
CREATE UNIQUE INDEX one_active_allocation_per_asset
  ON asset_allocations(asset_id) WHERE status = 'Active';
```
This partial unique index is your double-allocation guardrail at the DB
level — belt-and-suspenders alongside the application check.

### transfer_requests
```sql
CREATE TABLE transfer_requests (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  from_user_id INTEGER REFERENCES users(id),
  to_user_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested','Approved','Rejected')),
  requested_at TIMESTAMP DEFAULT now(),
  approved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP
);
```

### bookings
```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  resource_asset_id INTEGER NOT NULL REFERENCES assets(id),
  booked_by INTEGER NOT NULL REFERENCES users(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'Upcoming'
    CHECK (status IN ('Upcoming','Ongoing','Completed','Cancelled')),
  created_at TIMESTAMP DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX idx_bookings_asset_time ON bookings(resource_asset_id, start_time, end_time);
```
Overlap check (run in application/service layer before insert):
```sql
SELECT 1 FROM bookings
WHERE resource_asset_id = :asset_id
  AND status IN ('Upcoming','Ongoing')
  AND start_time < :new_end_time
  AND end_time > :new_start_time;
-- if any row returned -> reject
```

### maintenance_requests
```sql
CREATE TABLE maintenance_requests (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  raised_by INTEGER NOT NULL REFERENCES users(id),
  issue_description TEXT NOT NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Urgent')),
  photo_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending','Approved','Rejected','TechnicianAssigned','InProgress','Resolved')),
  approved_by INTEGER REFERENCES users(id),
  technician VARCHAR(120),
  created_at TIMESTAMP DEFAULT now(),
  resolved_at TIMESTAMP
);
```

### audit_cycles
```sql
CREATE TABLE audit_cycles (
  id SERIAL PRIMARY KEY,
  scope_department_id INTEGER REFERENCES departments(id),
  scope_location VARCHAR(160),
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Closed')),
  created_at TIMESTAMP DEFAULT now()
);
```

### audit_assignments
```sql
CREATE TABLE audit_assignments (
  id SERIAL PRIMARY KEY,
  audit_cycle_id INTEGER NOT NULL REFERENCES audit_cycles(id),
  auditor_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE (audit_cycle_id, auditor_id)
);
```

### audit_findings
```sql
CREATE TABLE audit_findings (
  id SERIAL PRIMARY KEY,
  audit_cycle_id INTEGER NOT NULL REFERENCES audit_cycles(id),
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  result VARCHAR(10) CHECK (result IN ('Verified','Missing','Damaged')),
  notes TEXT,
  recorded_by INTEGER REFERENCES users(id),
  recorded_at TIMESTAMP DEFAULT now(),
  UNIQUE (audit_cycle_id, asset_id)
);
```

### notifications
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type VARCHAR(40) NOT NULL,   -- e.g. 'AssetAssigned', 'BookingReminder'
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
```

### activity_logs
```sql
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(80) NOT NULL,     -- e.g. 'ASSET_ALLOCATED'
  entity_type VARCHAR(40),         -- e.g. 'asset'
  entity_id INTEGER,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT now()
);
```

## Asset status state machine (implement as ONE function, not scattered updates)

```
Available        -> Allocated          (on successful allocation)
Available        -> Reserved           (on booking, if resource-type asset)
Available/Allocated -> Under Maintenance (on maintenance request APPROVED)
Under Maintenance -> Available         (on maintenance RESOLVED)
Allocated         -> Available         (on return processed)
Available         -> Lost              (on audit close, confirmed missing)
Available/Allocated -> Retired         (admin/manager action)
Retired            -> Disposed         (admin/manager action)
```
Pseudocode:
```
function transitionAssetStatus(assetId, newStatus, triggeredBy, reason):
    asset = getAsset(assetId)
    if not isValidTransition(asset.status, newStatus):
        throw ValidationError("Invalid transition: " + asset.status + " -> " + newStatus)
    updateAssetStatus(assetId, newStatus)
    writeActivityLog(triggeredBy, "ASSET_STATUS_CHANGED", assetId, {from: asset.status, to: newStatus, reason})
```

## Indexing checklist
- `users(email)` — unique, already covered by constraint
- `assets(asset_tag)` — unique, already covered
- `assets(status)` — for dashboard KPI queries
- `asset_allocations(asset_id) WHERE status='Active'` — unique partial index (above)
- `bookings(resource_asset_id, start_time, end_time)` — for overlap checks
- `maintenance_requests(status)` — for approval queue queries
