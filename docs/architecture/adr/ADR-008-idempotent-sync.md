# ADR-008: Idempotent Synchronization

## Decision

Synchronization must be idempotent so that retries and replays do not duplicate received records.

## Why

- unstable connectivity makes retransmission inevitable
- technical receipt must be safe even after timeout or uncertain client state

## Repository evidence

- `backend/apps/submissions/views.py`
- backend idempotency test
