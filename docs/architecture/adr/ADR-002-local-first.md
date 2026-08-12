# ADR-002: Local-First Collection

## Decision

Persist collection work in the browser first and synchronize later.

## Why

- intermittent connectivity is a first-order constraint
- data entry must not depend on continuous internet access

## Repository evidence

- `frontend/src/lib/storage/indexedDb.ts`
- `frontend/src/repositories/local/submissionLocalRepository.ts`
- Playwright critical flow
