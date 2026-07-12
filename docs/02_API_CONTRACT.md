# AssetFlow — API Contract

Base URL: `/api/v1`. All authenticated routes expect `Authorization: Bearer <jwt>`.
All error responses use this shape:
```json
{ "error": true, "message": "Human-readable message", "field": "email" }
```
Validation errors always return `400` with a specific `field` where applicable
so the frontend can show inline errors — this is a scored requirement.

---
## Auth (Disha)

**POST /auth/signup**
```json
Request:  { "name": "Priya Shah", "email": "priya@co.com", "password": "..." }
Response 201: { "id": 12, "name": "...", "email": "...", "role": "Employee" }
```
Server always forces `role = 'Employee'`. Reject if email invalid format (400,
field: email) or already exists (409).

**POST /auth/login**
```json
Request:  { "email": "...", "password": "..." }
Response 200: { "token": "jwt...", "user": { "id":1, "name":"...", "role":"Admin", "department_id": 3 } }
```
401 on bad credentials, with generic message (don't reveal which field was wrong).

**GET /auth/me** — returns current user from token.

---
## Organization Setup (Disha) — Admin only unless noted

**GET/POST/PUT /departments**
```json
POST body: { "name": "Engineering", "head_user_id": 5, "parent_department_id": null }
```

**GET/POST/PUT /asset-categories**
```json
POST body: { "name": "Electronics", "custom_fields": { "warranty_period_months": 24 } }
```

**GET /employees** — list directory (all roles can view own dept; Admin sees all)

**PUT /employees/:id/role** — Admin only
```json
Request: { "role": "AssetManager" }
```

---
## Assets (Disha)

**GET /assets** — query params: `search, category_id, status, department_id, location`

**POST /assets**
```json
Request: {
  "name": "Dell Laptop", "category_id": 2, "serial_number": "SN123",
  "acquisition_date": "2025-01-10", "acquisition_cost": 55000,
  "condition": "New", "location": "HQ-3F", "is_bookable": false
}
Response: { "id": 44, "asset_tag": "AF-0044", "status": "Available", ... }
```

**GET /assets/:id** — full detail + allocation history + maintenance history

**POST /assets/:id/allocate**
```json
Request: { "employee_id": 12, "department_id": null, "expected_return_date": "2026-08-01" }
Response 200: { "allocation_id": 88, "status": "Active" }
Response 409 (already allocated): {
  "error": true, "message": "Currently held by Priya Shah",
  "current_holder": { "id": 12, "name": "Priya Shah" },
  "suggest_transfer": true
}
```

**POST /assets/:id/return**
```json
Request: { "condition_checkin_notes": "Minor scratch on lid" }
```

**POST /assets/:id/transfer-request**
```json
Request: { "to_user_id": 19 }
```

**POST /transfer-requests/:id/approve** — Asset Manager/Dept Head only
```json
Request: { "decision": "Approved" }  // or "Rejected"
```

---
## Bookings (Arush)

**GET /bookings?resource_asset_id=&date=** — for calendar view

**POST /bookings**
```json
Request: { "resource_asset_id": 7, "start_time": "2026-07-13T09:30:00", "end_time": "2026-07-13T10:30:00" }
Response 409 (overlap): { "error": true, "message": "Slot overlaps with an existing booking (09:00-10:00)" }
```

**POST /bookings/:id/cancel**

---
## Maintenance (Arush)

**GET /maintenance-requests?status=**

**POST /maintenance-requests**
```json
Request: { "asset_id": 44, "issue_description": "Screen flickering", "priority": "High" }
```

**PUT /maintenance-requests/:id/status**
```json
Request: { "status": "Approved" }  // triggers asset -> Under Maintenance
Request: { "status": "Resolved" }  // triggers asset -> Available
```

---
## Audit (Arush)

**POST /audit-cycles**
```json
Request: { "scope_department_id": 3, "date_range_start": "2026-07-13", "date_range_end": "2026-07-14" }
```

**POST /audit-cycles/:id/assign-auditor**
```json
Request: { "auditor_id": 9 }
```

**POST /audit-cycles/:id/findings**
```json
Request: { "asset_id": 44, "result": "Missing", "notes": "Not found in HQ-3F" }
```

**POST /audit-cycles/:id/close** — locks cycle, transitions confirmed-missing assets to `Lost`.

---
## Dashboard / Reports / Notifications (shared)

**GET /dashboard/kpis**
```json
Response: {
  "assets_available": 120, "assets_allocated": 45, "maintenance_today": 3,
  "active_bookings": 8, "pending_transfers": 2, "upcoming_returns": 6,
  "overdue_returns": [ { "asset_id":44, "asset_tag":"AF-0044", "employee":"Priya", "expected_return_date":"2026-07-10" } ]
}
```

**GET /reports/utilization** | **/reports/maintenance-frequency** | **/reports/department-allocation** | **/reports/booking-heatmap**

**GET /notifications** — current user's notifications, paginated
**PUT /notifications/:id/read**

**GET /activity-logs** — Admin only, filterable by user/entity/date

---
## Validation rules to enforce everywhere (backend)
- Email: RFC-basic regex check server-side, not just frontend
- Dates: `expected_return_date` cannot be in the past on creation; `end_time > start_time` on bookings
- Enum fields (status, role, priority, condition): reject anything not in the allowed set, 400 with field name
- All FK references (category_id, department_id, employee_id) validated to exist before insert — return 404/400, never a raw DB error
- Every state-changing endpoint requires the correct role — return 403 with clear message, not a silent no-op
