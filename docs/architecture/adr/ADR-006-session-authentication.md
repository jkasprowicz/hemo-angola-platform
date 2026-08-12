# ADR-006: Session Authentication

## Decision

Use Django session authentication with CSRF protection instead of browser-persisted API tokens.

## Why

- reduces token storage risk in offline-capable clients
- fits same-origin deployment model
- leverages mature Django auth primitives

## Repository evidence

- `backend/apps/core/views.py`
- `frontend/src/lib/api/httpClient.ts`
