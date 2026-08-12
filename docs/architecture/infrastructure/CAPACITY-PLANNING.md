# Capacity Planning

## Historical baseline from v1.0

Initial sizing reference:

- 2 vCPU
- 4 GB RAM
- 40-80 GB SSD
- PostgreSQL
- reverse proxy
- HTTPS
- backup

## Current interpretation

That baseline is suitable only as a starting point for MVP/pilot discussion.

## Variables still unknown

- number of pilot units
- number of operators per unit
- sync frequency
- dashboard query concurrency
- retention period for audit and submission versions
- real network characteristics at the pilot site

## Practical guidance

### Short-term pilot baseline

- keep single-node central deployment simple
- monitor database growth, sync latency and dashboard response time
- validate backup and restore before go-live

### Triggers for reassessment

- growing number of units or periods
- large audit-event growth
- frequent concurrent dashboard access
- requirement for shared local operation under poor connectivity

## Status

- `PROPOSED`
- requires real pilot telemetry and INS operational validation
