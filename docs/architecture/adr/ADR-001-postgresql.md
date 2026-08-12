# ADR-001: PostgreSQL

## Decision

Use PostgreSQL as the central relational database for non-test environments.

## Why

- predictable relational behavior
- open-source maturity
- good fit for Django
- suitable for structured submissions, audit events and dashboard aggregation

## Repository evidence

- `backend/hemo_angola/settings.py`
- `docker-compose.yml`
- `docker-compose.prod.yml`
