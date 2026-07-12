# AssetFlow — Project Context

## What this is
Enterprise Asset & Resource Management System (ERP-style). Any organization
(office, school, hospital, factory) tracks assets, allocates them, books shared
resources, runs maintenance workflows, and audits inventory — all through
structured lifecycle states, not spreadsheets.

Hackathon: Odoo Hiring Hackathon, 24 hours, 3-person team.
- **Disha** — Backend lead: DB schema, auth, asset core lifecycle
- **Arush** — Backend: booking, maintenance, audit, notifications
- **Drishti** — Frontend: all screens, UI/UX consistency

## What they're evaluating (from Odoo's brief — keep this pinned)
1. **Database design** — this is weighted highest. Proper relational schema,
   PostgreSQL/MySQL. No Firebase/Supabase/Mongo Atlas.
2. **Build from scratch** — minimal third-party API dependency.
3. **Real, dynamic data** — no static JSON in the final build.
4. **Robust input validation** — every user error must produce clear feedback
   (e.g. invalid email → visible error, not a silent failure or crash).
5. **Real team git usage** — commits from all 3 members, not one person pushing.
6. **Clean, intuitive UI** — consistent colors/spacing, sensible navigation.
7. Also scored: coding standard, logic, modularity, performance, scalability,
   security, usability, debugging, problem-solving approach.

## Non-negotiable product rules (from the spec — these ARE the test cases)
- Signup creates an **Employee** account only. No role selection at signup.
  Roles (Department Head, Asset Manager) are assigned **only** by Admin, from
  the Employee Directory screen. Never accept a `role` field on the signup
  endpoint.
- Asset statuses: `Available, Allocated, Reserved, Under Maintenance, Lost,
  Retired, Disposed`. Transitions must go through one central function, not
  scattered `UPDATE` statements.
- **Double-allocation must be blocked.** If Priya holds Laptop AF-0114 and Raj
  tries to allocate it, the system blocks it, shows "currently held by Priya,"
  and offers a Transfer Request instead.
- **Booking overlap must be blocked at the DB/service layer.** Room B2 booked
  9:00–10:00 → request for 9:30–10:30 rejected; request for 10:00–11:00 is fine.
- Maintenance requests must be **approved before** the asset flips to
  `Under Maintenance`. Workflow: Pending → Approved/Rejected → Technician
  Assigned → In Progress → Resolved.
- Audit cycles: assign auditors → auditor marks each asset Verified/Missing/
  Damaged → system auto-generates discrepancy report → closing the cycle locks
  it and updates statuses (e.g. confirmed-missing → Lost).
- Overdue returns/bookings/maintenance must be auto-flagged (computed, not
  manually set) and surfaced on the Dashboard + Notifications.

## User roles & permissions
| Role | Can do |
|---|---|
| Admin | Manage departments, categories, audit cycles, promote roles; view org-wide analytics |
| Asset Manager | Register/allocate assets; approve transfers, maintenance, audit discrepancies, returns |
| Department Head | View dept assets; approve allocation/transfer requests within dept; book resources |
| Employee | View own assets; book resources; raise maintenance requests; initiate return/transfer |

## The 10 screens (see FRONTEND.md for detail + ownership)
1. Login/Signup
2. Dashboard/Home (KPIs)
3. Organization Setup (Admin only — Departments / Categories / Employee Directory)
4. Asset Registration & Directory
5. Asset Allocation & Transfer
6. Resource Booking
7. Maintenance Management
8. Asset Audit
9. Reports & Analytics
10. Activity Logs & Notifications

## High-level workflow
Admin sets up departments/categories → promotes roles → Asset Manager
registers assets (enter as Available) → assets allocated (blocked if already
held, offers transfer) or marked shared/bookable → employees book resources
(overlap-checked) → maintenance requests raised → approved → asset flips to
Under Maintenance → resolved → back to Available → periodic audits verify
assets and flag discrepancies → everything logged and surfaced via
notifications.

## Files in this pack
- `01_DATABASE_SCHEMA.md` — full schema, relationships, state machines (Disha)
- `02_API_CONTRACT.md` — every endpoint, request/response shape (all 3)
- `03_BACKEND_GUIDE.md` — module breakdown, validation rules, tech notes (Disha + Arush)
- `04_FRONTEND_GUIDE.md` — screen specs, component breakdown, design system (Drishti)
- `05_ROADMAP.md` — hour-by-hour plan, ownership, demo script
- `06_GIT_WORKFLOW.md` — branch strategy, commit conventions
