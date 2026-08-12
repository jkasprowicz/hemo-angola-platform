# Central Infrastructure

## As-is baseline

The repository currently supports a central stack composed of:

- Linux host
- Nginx reverse proxy
- Gunicorn application server
- Django/DRF backend
- PostgreSQL database
- static frontend build served by Nginx

## Security and runtime baseline

Implemented in configuration:

- host allow-listing
- trusted origins
- optional secure cookies
- optional SSL redirect
- optional HSTS
- health endpoint for service checks

## Operational baseline

Already documented in the repository:

- deploy sequence
- environment variable contract
- backup and restore runbook
- production readiness report

## Current gaps

- no infrastructure-as-code in the repo
- no centralized log stack
- no automated backup schedule in code
- no validated pilot domain or TLS certificate workflow captured as executed state
