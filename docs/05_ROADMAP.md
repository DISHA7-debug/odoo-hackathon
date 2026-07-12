# AssetFlow — 24 Hour Roadmap

## Hour 0-1: Alignment
- All: confirm stack, agree on API contract (already drafted — adjust if needed live)
- Disha: init DB, run migrations for all tables
- Arush: review contract, set up local Postgres connection, scaffold module folders
- Drishti: scaffold routing, lock design tokens (colors/type/spacing), build shared components (badge, table, modal, toast)

## Hour 1-5: Foundations
- Disha: auth (signup/login/JWT), departments/categories/employees CRUD, role promotion, shared middleware (requireAuth, requireRole, errorHandler)
- Arush: bookings + maintenance_requests schema finalized, skeleton routes, seed data collaboration
- Drishti: Login/Signup screen (real API), Dashboard shell (static), Org Setup UI (3 tabs)

## Hour 5-10: Core lifecycle (highest-stakes window)
- Disha: asset registration, asset status state machine, allocation + double-allocation block, transfer request flow
- Arush: booking overlap validation + status lifecycle, maintenance approval workflow logic, calls into Disha's status transition function
- Drishti: Asset Directory + detail screen, Allocation & Transfer screen (real API)

## Hour 10-14: Secondary modules
- Disha: dashboard KPI aggregation queries, overdue auto-flagging logic, begin reports queries
- Arush: audit cycle creation, auditor assignment, findings capture, discrepancy report, close-cycle logic
- Drishti: Resource Booking screen, Maintenance Management screen

## Hour 14-18: Reports, audit UI, notifications
- Disha: finish reports queries, harden validation on all owned endpoints
- Arush: notification triggers wired into every event, activity log writes, finish /reports endpoints if shared
- Drishti: Audit screen, Reports & Analytics screen (charts), Activity Logs/Notifications screen

## Hour 18-21: Integration pass
- All: full walkthrough as each of the 4 roles, end to end
- Disha + Arush: validation sweep — every field, every state transition, every error path
- Drishti: responsive pass, empty/loading/error states everywhere, toast consistency

## Hour 21-23: Polish + demo prep
- Fix bugs found in walkthrough
- Load final seed data (realistic names/dates, pre-built conflict scenarios)
- Rehearse demo script (below)

## Hour 23-24: Submission
- Final merge to main, README with setup steps, submit repo link + video

---

## Demo script (rehearse this, don't wing it)
1. Login as Admin → show Org Setup, promote an employee to Asset Manager live
2. Login as Asset Manager → register a new asset → show it enters as Available
3. Allocate asset to Employee A
4. Try to allocate the SAME asset to Employee B → show the block + "currently held by" + Transfer Request button
5. Book a shared resource → try an overlapping slot → show rejection
6. Raise a maintenance request as Employee → approve as Asset Manager → show asset flips to Under Maintenance → resolve → back to Available
7. Create an audit cycle → assign auditor → mark one asset Missing → close cycle → show it becomes Lost + discrepancy report
8. Show Dashboard KPIs update live, show notifications, show Reports charts

This sequence hits literally every scored requirement in one flow — practice
it so it takes under 5 minutes.

## Risk checkpoints (stop and reassess if you hit these)
- By hour 5: if auth + org setup isn't done, cut scope on categories'
  custom_fields (skip JSONB flexibility, hardcode a couple fields) rather than
  let it block allocation work.
- By hour 10: if allocation conflict logic isn't solid, this is the #1 thing
  to protect — it's explicitly called out in the spec with a named example.
  Everything else can flex before this does.
- By hour 18: if reports/charts aren't done, a simple table of numbers beats
  a broken chart. Don't sink time into chart polish over core functionality.
