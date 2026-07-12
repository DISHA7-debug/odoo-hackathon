# AssetFlow — Frontend Guide (Drishti)

## Suggested stack
React + Vite + Tailwind CSS. Add a lightweight component library only if it
speeds you up (shadcn/ui components are fine) — don't spend hackathon hours
building basic buttons/inputs from scratch, spend them on layout/flow polish.

## Design system — lock this in hour 0-1, before any screen
- **Color palette**: pick one primary (brand action color), one neutral scale
  (grays for backgrounds/borders/text), and semantic colors for status:
  - Available/Verified/Approved → green
  - Allocated/Ongoing/In Progress → blue
  - Under Maintenance/Pending → amber
  - Lost/Rejected/Overdue → red
  - Retired/Disposed/Cancelled → gray
  Use these consistently as status badges across every screen — it's an easy,
  high-visibility way to look "product-grade" rather than generic.
- **Typography**: one font family, 3-4 sizes max (heading, subheading, body, caption)
- **Spacing**: stick to a consistent scale (Tailwind defaults are fine — 4/8/12/16/24px)
- **Component patterns to reuse everywhere**: status badge, data table (sortable
  columns, empty state, loading skeleton), modal/drawer for forms, toast for
  success/error feedback, confirmation dialog for destructive actions

## Screen-by-screen spec

### 1. Login/Signup
- Two tabs or two routes. Signup form: name, email, password only — no role field.
- Inline validation: invalid email format shown immediately on blur, not just on submit.
- Login: email/password, "forgot password" link (can be a stub for hackathon), clear error on 401.

### 2. Dashboard
- KPI cards row: Assets Available, Assets Allocated, Maintenance Today, Active
  Bookings, Pending Transfers, Upcoming Returns — pull from `/dashboard/kpis`.
- Overdue section visually separated (red accent) from upcoming.
- Quick action buttons: Register Asset, Book Resource, Raise Maintenance Request
  → open the relevant modal/form directly from here.

### 3. Organization Setup (Admin only — hide/redirect for other roles)
- 3 tabs: Departments, Asset Categories, Employee Directory.
- Employee Directory tab: table with role dropdown per row — this is the ONLY
  place role change UI exists anywhere in the app.
- Department form supports optional parent department (dropdown of existing depts).

### 4. Asset Registration & Directory
- Table/grid view with filters: category, status, department, location, search
  by tag/serial.
- Status shown as colored badge (see palette above).
- Detail view (click a row): shows full info + two tabs: Allocation History, Maintenance History.
- Registration form: all fields from schema; asset_tag shown as "auto-generated" (not user-entered).

### 5. Asset Allocation & Transfer
- Allocate button on asset detail → picks employee/department + optional expected return date.
- On conflict (409 response), show the "currently held by X" message with a
  prominent "Request Transfer" button instead of a dead-end error.
- Transfer requests list (for approvers): Approve/Reject actions.
- Return flow: form for condition check-in notes, confirms status reverts to Available.

### 6. Resource Booking
- Calendar view per bookable resource (a simple day/week grid is enough —
  doesn't need to be a full calendar library, a styled table works).
- Booking form: start/end time pickers; on overlap (409), show which existing
  booking it conflicts with.
- Status badges: Upcoming/Ongoing/Completed/Cancelled.

### 7. Maintenance Management
- List view filterable by status.
- Raise request form: asset picker, issue description, priority, photo upload (optional/stub).
- Approver view: Approve/Reject buttons, then Technician Assignment field, then
  status progression buttons (In Progress → Resolved).

### 8. Asset Audit
- Create audit cycle form: scope (department/location), date range.
- Auditor assignment (multi-select users).
- Auditor's working view: list of in-scope assets, each with
  Verified/Missing/Damaged buttons + notes field.
- Close Cycle button (confirmation dialog — irreversible), then shows
  generated discrepancy report.

### 9. Reports & Analytics
- Charts: utilization trend (line/bar), maintenance frequency by category
  (bar), department-wise allocation (bar/pie), booking heatmap (simple grid
  with intensity shading is fine).
- Use a lightweight charting lib (recharts) — don't hand-roll SVG charts under time pressure.
- Export button (CSV export is enough — don't build PDF generation unless time allows).

### 10. Activity Logs & Notifications
- Notification bell/dropdown in the top nav, unread count badge.
- Full notifications list page, mark-as-read.
- Activity log table (Admin only): user, action, entity, timestamp, filterable.

## Error/loading/empty states (apply to every screen — this is scored under "usability")
- Every list view: loading skeleton, empty state with helpful message ("No
  assets yet — register your first one"), error state if fetch fails.
- Every form: disable submit while in-flight, show field-level errors from
  the API's `{field, message}` shape, show a toast on success.
- Every destructive action (close audit cycle, reject request): confirmation
  dialog before firing.

## Navigation structure
Persistent sidebar (role-aware — hide Org Setup for non-admins, hide Reports
for Employees if you want tighter scoping) + top bar with notifications +
user menu. Keep it to one level of nesting; don't bury screens behind multiple clicks.

## Building against the API contract before backend is ready
Use `02_API_CONTRACT.md` request/response shapes to build a simple mock layer
(msw, or just hardcoded fetch stubs behind an env flag) so you're never
blocked waiting on Disha/Arush — swap to real endpoints as they land.
