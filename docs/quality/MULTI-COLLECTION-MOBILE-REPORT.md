# Multi-Collection And Mobile Evolution Report

Date: Monday, August 10, 2026
Project: HEMO-ANGOLA MVP

## Scope

This sprint evolved the MVP in two priority areas:

1. Allow more than one collection for the same unit and reporting month.
2. Improve the mobile experience across collection, records, sync, and dashboard flows.

The work preserved the current local-first model, synchronization contract, auditability, and dashboard traceability.

## Root Cause Of The Previous Limitation

The main restriction was not a hard backend impossibility. It came from product and frontend assumptions that treated one reporting period as if it could only have one active collection per unit.

The most visible constraints were:

- local repository guards that blocked creating another draft in the same context
- UI copy and actions centered on a single in-progress collection
- record ordering and summary views keyed to the latest save timestamp rather than an explicit collection date
- sync payloads and dashboard trace views without first-class collection-date semantics

This meant the MVP behaved like a "one collection per month" workflow, even though the domain needs several collection events inside the same monthly period.

## Implemented Model Evolution

The submission model now distinguishes the collection event from the reporting period.

### New data points

- `collection_date`: explicit date of the blood collection event
- `closed_at`: when the local collection was finalized
- `submitted_at`: when the device sent the record for synchronization
- `received_at`: when the backend persisted the synchronized version
- `updatedAt` on the frontend local record model, replacing the old "save moment as business identity" behavior

### Behavioral outcome

- Multiple collections can now coexist for the same `health_unit + reporting_period`.
- The application can continue the most recently updated active draft without blocking a new one from being created later in the same month.
- Traceability is clearer because the user can now distinguish collection date, local closure, submission, and server receipt.

## Migration Strategy

The backend migration adds the new timestamps and backfills only what can be inferred safely.

### What was backfilled

- `SubmissionVersion.received_at` from legacy `synced_at`
- `Submission.closed_at`, `submitted_at`, and `received_at` from the related versions when available

### What was intentionally not invented

- Legacy `collection_date` values were left null

This decision avoids fabricating clinical-operational dates that were never captured in the original MVP. It keeps the migration honest and supports future reporting rules without introducing false historical precision.

## Sync Impact

The synchronization contract now carries explicit collection semantics.

- Sync payloads include `collection_date`.
- Sync accepts optional `submitted_at`.
- Backend validation now ensures `collection_date` belongs to the chosen reporting period.
- The create/update path preserves idempotency and avoids downgrading an already more advanced submission status.
- The API response and dashboard trace pipeline now expose the collection date and lifecycle timestamps needed for audit trails.

## Dashboard Impact

Dashboard traceability now reflects the evolved model instead of collapsing everything into a single monthly entry interpretation.

- Trace records expose `collection_date`, `closed_at`, `submitted_at`, and `received_at`.
- The dashboard can show multiple collections inside the same monthly period.
- Mobile trace cards present period-level totals while still listing each collection event individually.

This keeps the management view compatible with the MVP while making repeated monthly collection activity visible.

## Mobile UX Improvements

The mobile pass focused on high-friction pages already used in the field.

### Collection flow

- Added editable collection date input.
- Added validation that prevents saving or closing with a date outside the reporting period.
- Reworked step content rendering for mobile to avoid duplicate accessible controls from simultaneous desktop/mobile DOM variants.
- Improved status and summary visibility for small screens.

### Records and synchronization

- Records now show collection date directly.
- Records and sync history gained card-based mobile layouts.
- Detail pages now expose the full lifecycle timeline: updated, closed, submitted, and received.

### Dashboard

- Dashboard now switches cleanly between table and mobile-card layouts.
- The mobile view preserves period summaries and collection-level traceability.

## Quality Validation

The sprint was validated on Monday, August 10, 2026 with the following checks:

- Frontend type-check: `npm run typecheck`
- Frontend lint: `npm run lint`
- Frontend production build: `npm run build`
- Frontend unit/integration tests: `npm test`
- Frontend end-to-end tests: `npx playwright test`
- Backend framework validation: `python3 manage.py check`
- Backend automated tests: `python3 manage.py test`

## Risks And Follow-Ups

- Historical records created before this sprint may not have `collection_date`, by design.
- The frontend IndexedDB upgrade depends on legacy normalization paths continuing to be respected in future schema changes.
- The production build still reports a large JavaScript chunk warning; it is non-blocking for this sprint but should be monitored in a later performance pass.

## Conclusion

The MVP now supports repeated collection events within the same unit and monthly reporting period, with clearer audit timestamps and materially better mobile usability, without expanding scope into deployment, AI, advanced permissions, or unrelated platform features.
