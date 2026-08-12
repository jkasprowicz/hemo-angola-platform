# Sync Protocol

## Scope

This document records the current sync contract and highlights where the repository is implemented versus TO-BE.

## Current payload structure

Each sync item includes:

- local record ID
- submission UUID
- version UUID
- version number
- institution ID
- unit ID
- reporting period ID
- collection date
- payload with cycle metadata and responses
- validation summary
- audit events
- closed timestamp
- submitted timestamp

## UUID strategy

Implemented:

- `submission_uuid` identifies the submission across retries
- `version_uuid` identifies the version payload
- local record IDs and audit event IDs are also UUIDs in the client

## Idempotency

Implemented:

- backend uses `client_submission_uuid` to find or create the submission
- if the same submission/version pair already exists, the API returns a successful idempotent receipt

## Retry and backoff

Implemented:

- sync failures mark the queue item as `failed`
- `nextAttemptAt` is set using exponential backoff
- backoff is capped at 60 seconds

## Status model

Current client sync item states:

- `queued`
- `syncing`
- `failed`
- `synced`

Current local record sync states:

- `local_only`
- `pending`
- `syncing`
- `synced`
- `error`
- `conflict`

Current server technical states:

- `received`
- plus schema support for `accepted`, `returned`, `consolidated`

## Acknowledgement

Implemented:

- API returns `results[]` with `localId`, `submissionUuid`, `versionNumber`, `status`, `syncedAt`, `idempotent`
- frontend marks the record as received/synced and removes the queue item

## Timestamps

Implemented timestamps include:

- created
- updated
- closed
- submitted
- synced
- received
- last sync attempt

## Order and resend behavior

Implemented behavior:

- eligible queue items are selected by status and `nextAttemptAt`
- resend is safe for already-received technical items due to idempotent backend logic

## TO-BE areas

- explicit conflict response semantics such as HTTP `409 Conflict`
- generic replay ordering guarantees across dependent submissions
- server-issued acknowledgement IDs beyond existing receipt metadata
