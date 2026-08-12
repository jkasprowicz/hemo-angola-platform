# ADR-005: IndexedDB Persistence

## Decision

Use IndexedDB as the local browser persistence layer.

## Why

- more robust than volatile in-memory state
- suitable for records, queue items and audit history
- supports resume-after-reload behavior

## Repository evidence

- `frontend/src/lib/storage/indexedDb.ts`
- `frontend/src/lib/sync/syncEngine.ts`
