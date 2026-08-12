# Conflict Resolution

## Current state

Conflict handling is a real gap in the current repository.

Evidence:

- client and server models define `conflict` statuses
- current sync API happy path only performs technical receipt and idempotent replay checks
- there is no end-to-end conflict detection, `409 Conflict` branch or user resolution flow

## What can be stated safely today

- replay of the same submission/version is handled idempotently
- semantic divergence between two competing updates is not fully modeled
- institutional review/return workflow is also not yet the place where such conflicts are resolved

## Future options

### Optimistic concurrency

- store and compare server version counters or hashes
- reject stale writes

### Version check

- require the client to reference the last known accepted or received version
- create a new correction only from an acknowledged prior version

### `409 Conflict`

- return explicit conflict responses from the API
- keep the local record pending manual review rather than silently failing

### Manual review

- provide reviewer/admin flow to compare payloads and choose authoritative state

## Policy boundary

Institutional policy is not defined in this repository.

Therefore:

- no institutional conflict rule is asserted here
- final conflict governance remains `DEPENDS ON INS`
