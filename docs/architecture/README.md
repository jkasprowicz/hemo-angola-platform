# HEMO-ANGOLA Architecture Docs

## Purpose

This directory is the technical and architectural baseline for the current `hemo-angola-platform` repository as of 2026-08-12.

Primary sources used in this sprint:

- Current backend and frontend code
- Django migrations
- Automated tests
- Deployment configuration and operational docs
- Historical PDF specification `HEMO-ANGOLA - Especificação Técnica e Arquitetura da Plataforma.pdf`

## Repository Inventory

### Product runtime

- `backend/`: Django + Django REST Framework, PostgreSQL-first backend, session authentication, bootstrap, sync, dashboard and audit APIs.
- `frontend/`: React + Vite PWA with IndexedDB persistence, local collection workflow, sync queue, dashboard and audit screens.
- `deploy/`: example Nginx and systemd baselines.
- `docker-compose.yml`: development stack with PostgreSQL, Django dev server and Vite dev server.
- `docker-compose.prod.yml`: production-oriented baseline with PostgreSQL, Gunicorn and Nginx.
- `.env.example`: environment contract for application, database and security hardening.

### Existing documentation before this sprint

- `docs/deployment/README.md`
- `docs/deployment/BACKUP-AND-RESTORE.md`
- `docs/deployment/PRODUCTION-READINESS-REPORT.md`
- `docs/quality/MULTI-COLLECTION-MOBILE-REPORT.md`
- Historical PDF specification in this folder

## Current Product Snapshot

- Authentication, CSRF, session management and bootstrap are implemented.
- Local-first collection workflow is implemented in the browser with IndexedDB.
- Sync queue, retry/backoff and idempotent server receipt are implemented.
- Audit trail exists in both client event history and server audit events.
- Dashboard exists with three implemented indicators and temporal aggregation.
- Institutional review, return/accept workflow, conflict handling and a dedicated admin console remain partial or TO-BE.

## Document Map

- `HEMO-ANGOLA-TECHNICAL-SPECIFICATION.md`: living specification for the current codebase.
- `02-functional-requirements.md`: functional requirements extracted from code, tests and v1.0.
- `03-non-functional-requirements.md`: non-functional requirements with implemented, partial and proposed status.
- `requirements-traceability-matrix.md`: requirement-to-design-to-implementation-to-test mapping.
- `ARCHITECTURE-AUDIT-V1.1.md`: audit of v1.0 versus repository state.
- `versions/v1.0/`: Markdown preservation of the historical specification.
- `indicators/`, `offline/`, `infrastructure/`: domain-specific architecture notes.
- `adr/`: lightweight ADR baseline referenced by the traceability matrix.

## Conventions

- `IMPLEMENTED`: supported directly by code and usually covered by tests.
- `IMPLEMENTED PARTIALLY`: code exists but workflow or governance is incomplete.
- `TO-BE`: desired for pilot but not implemented in the current repository.
- `PROPOSED`: architectural recommendation not yet validated in implementation.
- `DEPENDS ON INS`: requires Institute of Blood governance, policy or operational validation.
