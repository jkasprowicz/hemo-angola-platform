# HEMO-ANGOLA Technical Specification

Version: 1.1 living baseline  
Date: 2026-08-12  
Status: repository-aligned technical baseline

## 1. Objective and scope

HEMO-ANGOLA is a digital platform for structured collection of aggregated hemotherapy indicators with local persistence, later synchronization, auditability and central monitoring support.

Current in-scope capabilities evidenced in code:

- Authentication by Django session
- Context bootstrap by institution, unit and reporting period
- Local collection lifecycle by unit and period
- Aggregated base-data capture through a demonstrative catalog
- Local validation and derived indicator calculation
- Persistent browser storage with IndexedDB
- Explicit close and later synchronization
- Central technical receipt with idempotency
- Record listing, record detail and audit viewing
- Dashboard with three implemented indicators and period filters

Current out-of-scope or incomplete capabilities:

- Individual donor or patient management
- LIS/HIS integration
- Full institutional review and acceptance workflow
- Complete sync conflict workflow
- Dedicated administrative console beyond Django Admin
- National rollout architecture

## 2. Technical inventory

### Backend

- Framework: Django 4.2 + Django REST Framework
- Main apps: `core`, `submissions`, `dashboard`, `accepted_data`, `consolidation`, `validation`
- Persistence: PostgreSQL by default, SQLite only for tests when explicitly enabled
- Auth: session authentication with CSRF protection
- APIs: health, CSRF, login, logout, session, bootstrap, sync, server records, audit events, dashboard

### Frontend

- Stack: React + TypeScript + Vite + Mantine
- Runtime mode: PWA with browser-local persistence
- Storage: IndexedDB stores for records, sync queue, metadata and audit events
- Core domains: auth, collections, synchronization, records, dashboard, audit

### Deploy baseline

- Development: local compose with PostgreSQL, Django dev server and Vite dev server
- Production baseline: Nginx -> Gunicorn/Django -> PostgreSQL
- Operational notes: deployment, backup/restore and readiness docs already exist under `docs/deployment/`

## 3. Implemented architecture

### Container view

`PWA React -> IndexedDB -> Sync Engine -> Django/DRF API -> PostgreSQL`

Supporting deployment path:

`Browser -> Internet/HTTPS -> Nginx -> Gunicorn -> Django -> PostgreSQL`

### Main architectural choices

- Local persistence is mandatory for collection continuity.
- Synchronization is explicit and decoupled from collection closing.
- Session authentication avoids long-lived client tokens in IndexedDB.
- The collection catalog is bootstrapped from backend metadata instead of hardcoded screen-only forms.
- Dashboard values are recalculated from received base data rather than edited manually.

## 4. Domain model

Core implemented entities:

- `Institution`
- `Unit`
- `UserProfile`
- `ReportingPeriod`
- `CollectionModule`
- `CollectionVariable`
- `IndicatorDefinition`
- `Submission`
- `SubmissionVersion`
- `AuditEvent`
- `AcceptedData`

Core client-side runtime entities:

- `LocalSubmissionRecord`
- `SyncQueueItem`
- `RecordEvent`
- `ValidationSummary`
- Derived indicators calculated from local responses

Operational anchor:

- Every collection cycle is scoped to `unit + reporting period`.
- The browser record is the operational cycle.
- Server `Submission` and `SubmissionVersion` are the central technical receipt artifacts.

## 5. Operational workflow

Current implemented happy path:

1. User authenticates through Django session.
2. Frontend loads bootstrap context, reporting periods and demonstrative catalog.
3. Operator explicitly starts a new collection.
4. Responses are stored locally and can be resumed after reload.
5. Validation summary and calculated indicators are updated locally.
6. Operator closes the collection only when validation passes.
7. A persistent queue item is created for later synchronization.
8. Sync engine posts queued items to `/api/sync/`.
9. Backend creates or reuses `Submission` by `client_submission_uuid`.
10. Backend stores `SubmissionVersion` and returns technical receipt status.
11. Frontend marks the record as `received` and removes the queue item.

## 6. Data and state model

### Collection status in frontend

- `in_progress`
- `ready_for_review` is typed but not materially used yet; current derivation returns `in_progress`
- `closed`
- `received`
- `accepted` typed but not exercised by implemented workflow
- `rejected` typed but not exercised by implemented workflow

### Sync status in frontend

- `local_only`
- `pending`
- `syncing`
- `synced`
- `error`
- `conflict` typed, but conflict handling is still a gap

### Server-side receipt status

- `Submission.current_status`: includes `submitted`, `synced`, `returned`, `accepted`, `consolidated`
- `SubmissionVersion.status`: includes `queued`, `synced`, `error`, `conflict`, `returned`, `received`, `accepted`, `consolidated`

Current implementation nuance:

- The active happy path reaches technical `received` and frontend `received/synced`.
- Institutional acceptance exists in the schema but is not implemented as a full business workflow.

## 7. Indicator model as implemented today

- Indicators are defined in the backend through `IndicatorDefinition`.
- Bootstrap returns modules, variables and indicators to the frontend.
- Local validation summary contains derived indicator values.
- Dashboard currently computes three indicators from received base data:
  - percentage of voluntary donations
  - clinical inaptitude rate
  - laboratory reactivity rate

Current catalog posture:

- The dataset is demonstrative.
- Final national indicator matrix remains dependent on scientific and INS validation.

## 8. Connectivity-resilient architecture

Implemented building blocks:

- IndexedDB persistence for records, queue, metadata and audit
- Persistent sync queue
- Recovery of interrupted sync attempts on app bootstrap
- Retry with exponential backoff capped at 60 seconds
- Explicit user-triggered sync from the synchronization screen
- Friendly network error messaging

Current limitation:

- Multi-user offline coordination across devices is not implemented.
- Conflict policy is not fully materialized in UI or API semantics.

## 9. Security baseline

Implemented:

- Django session authentication
- CSRF endpoint and cookie-based CSRF flow
- Secure-cookie and HSTS knobs by environment
- Same-origin-friendly API design
- Minimal audit trail for auth, sync and dashboard views

Partial or pending:

- Final institutional RBAC policy
- Structured observability stack
- Hardened production HTTPS rollout validated in a real pilot environment

## 10. Infrastructure baseline

Current repository baseline supports:

- Development environment via Docker Compose
- Production-oriented deployment via Gunicorn and Nginx
- PostgreSQL central database
- Health checks
- Manual backup and restore procedures

Pilot constraints still pending:

- Final hosting topology and domain
- INS-approved pilot unit and operational model
- Capacity validation from real number of users, units and periods

## 11. Testing baseline

Evidence available in the repository:

- Django tests for health, auth, bootstrap, sync idempotency and dashboard aggregation
- Vitest tests for sync, IndexedDB-facing repositories, collection form behavior and shared components
- Playwright E2E for local-first flow, reload recovery, sync and logout protection

## 12. Known gaps

- Full reviewer workflow is not implemented.
- Acceptance and return are not implemented as complete institutional steps.
- Conflict detection and resolution are only partially represented in status models.
- `accepted_data` and `consolidation` exist as structural signals but are not wired into a full flow.
- Dedicated admin UI for users, units, periods and indicator management is absent.

## 13. Decision summary

- ADR-001: PostgreSQL central store
- ADR-002: local-first/browser-persistent operation
- ADR-003: Django/DRF backend
- ADR-004: React PWA frontend
- ADR-005: IndexedDB browser persistence
- ADR-006: session authentication
- ADR-007: configurable indicator catalog
- ADR-008: idempotent synchronization

See `docs/architecture/adr/` for the lightweight ADR baseline created in this sprint.
