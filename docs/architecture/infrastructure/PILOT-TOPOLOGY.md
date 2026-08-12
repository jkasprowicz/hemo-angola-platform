# Pilot Topology

## Current central topology

Implemented repository baseline:

`clients -> internet -> Nginx -> Gunicorn/Django -> PostgreSQL`

Characteristics:

- browser clients interact with same-origin frontend and `/api/`
- reverse proxy terminates public traffic
- PostgreSQL is not exposed directly to clients
- backup is documented as an operational obligation

## Alternative topology for intermittent connectivity sites

Conceptual alternative:

`clients -> LAN -> edge node -> eventual internet -> central server`

Current status:

- `PROPOSED`
- not implemented in this repository

## Implications

- current code fully supports the central topology
- the edge topology would require new operational and synchronization layers
- pilot diagnosis should decide whether the added complexity is justified
