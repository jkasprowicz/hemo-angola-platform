# HEMO-ANGOLA Technical Specification v1.0

Historical source converted from the repository PDF on 2026-08-12.  
Source PDF date: 2026-08-08.  
Purpose: preserve the historical baseline without silently replacing it.

## Document control

- Code: `HA-ARCH-SPEC-001`
- Version: `1.0`
- Status: version for technical review
- Classification: project technical document

Version history captured in the PDF:

- `0.1` on 2026-08-08: initial technical consolidation
- `0.2` on 2026-08-08: editorial consolidation
- `1.0` on 2026-08-08: prepared for publication and human review

## 1. Introduction

The historical document presents a visually prepared technical specification for HEMO-ANGOLA. Its stated intent is to organize already approved technical content in a readable form rather than redefine architecture or scope.

## 2. Objective and scope

The historical objective is to operationalize structured collection of hemotherapy indicators with local persistence, later synchronization, traceability and support for consolidation and managerial monitoring.

In scope in v1.0:

- authentication
- units
- periods
- collection
- aggregated base data
- calculated indicators
- local persistence
- close
- synchronization
- records
- traceability
- minimal functional administration
- pilot

Out of scope in v1.0:

- electronic medical record
- LIS
- HIS
- full hospital management system
- individual patient management
- individual donor management
- national rollout
- automated clinical decision

Historical note from the PDF:

- dashboard minimum, full institutional workflow, central consolidation and pilot operation were still marked as TO-BE

## 3. Context of the system

The platform is framed as the technological product of the PROAFRICA project. The scientific project defines problem, indicators, methodology and pilot; the technical specification defines how the platform is designed, implemented, tested, deployed and operated.

The operational anchor adopted by the prototype is `unit + period`.

Main actors in the historical baseline:

- unit operator
- reviewer
- INS manager
- administrator
- technical team

## 4. Stakeholders

Historical stakeholder summary:

- Operator: collect and send data
- Reviewer: institutional review, return and accept, still dependent on formal definition
- Manager: accompany indicators, dashboard still planned
- Administrator: sustain functional governance, dedicated console still absent
- Technical team: maintain environment and support
- Scientific coordination: preserve adherence to project
- INS: validate pilot, indicators, roles and pilot unit

## 5. Platform maturity matrix

The PDF explicitly classified the platform approximately as follows:

- Authentication: implemented
- RBAC: partially implemented
- Collection: implemented
- Indicators: partially implemented
- IndexedDB: implemented
- Synchronization: partially implemented
- Records: implemented
- Institutional review: planned for pilot
- Institutional acceptance: gap
- Consolidation: planned for pilot
- Dashboard: planned for pilot
- Functional administration: partially implemented
- Backup/restore: planned for pilot
- Observability: partially implemented
- Pilot infrastructure: depends on INS
- LIS/HIS integrations: out of scope

## 6. Critical requirements

The historical document highlighted these as critical:

- `FR-COL-001`
- `FR-COL-004`
- `FR-SYNC-001`
- `FR-SYNC-004`
- `FR-REC-001`
- `FR-IND-001`
- `NFR-CONN-001`
- `NFR-SEC-001`
- `NFR-REC-001`
- `NFR-BKP-001`

## 7. Solution architecture

Historical high-level chain:

`PWA -> local persistence -> Sync Engine -> API -> PostgreSQL -> consolidation -> dashboard`

The PDF stated the platform adopts a connectivity-resilient architecture with local persistence and later synchronization.

## 8. Domain model

The historical domain emphasized the distinction between:

- `Collection` as the local operational cycle
- `Submission` as the technical package sent to the backend

It also named the following concepts:

- `Institution`
- `Unit`
- `ReportingPeriod`
- `CollectionModule`
- `CollectionVariable`
- `CollectionResponse`
- `IndicatorDefinition`
- `CalculatedIndicator`
- `Submission`
- `SubmissionVersion`
- `SyncQueue`
- `AuditEvent`
- `UserProfile`

## 9. Operational model

Historical flow:

`Login -> Home -> Start collection -> Fill -> Save -> Continue -> Review -> Close -> Select for synchronization -> Send -> Technically received -> Future institutional review`

Main historical points:

- collection start is explicit
- filling is modular
- autosave occurs on the same collection
- local persistence is default
- close is a state transition, not a sync action

## 10. States

The historical specification separated:

- collection business state
- sync transport state

The state-machine text referenced:

- collection states: `IN_PROGRESS`, `READY_FOR_REVIEW`, `CLOSED`, `RECEIVED`, `ACCEPTED`, `REJECTED/RETURNED`
- sync states: `LOCAL_ONLY`, `PENDING`, `SYNCING`, `SYNCED`, `ERROR`, `CONFLICT`

It explicitly warned that the backend still simplified parts of `received` versus `accepted`.

## 11. Data architecture

Historical data flow:

`base data -> validation -> indicator -> submission -> technical receipt -> institutional review -> acceptance/return -> consolidation -> dashboard`

Key historical rules:

- operational anchor is `UNIT + PERIOD`
- data is primarily aggregated
- the first closed collection should be perceived as version 1
- later corrections should produce a new version
- technical receipt must not be confused with institutional acceptance

## 12. Connectivity-resilient architecture

The historical text preferred the framing "local persistence with later synchronization" rather than using offline-first as the product identity.

It emphasized:

- offline operation and local preservation
- persistent queue
- reconnection and later transmission
- retry with backoff
- technical receipt confirmation
- idempotency to avoid duplication

It also warned that conflict handling and institutional acceptance remained incomplete.

## 13. Security

Historical AS-IS:

- Django session
- CSRF
- session-based authentication
- synthetic and aggregated data by default
- minimal audit trail
- intended HTTPS in public environment

Historical TO-BE:

- institutional RBAC
- export governance
- structured logs
- operational backup and restore routine

## 14. Infrastructure

Historical baseline sizing:

- Linux LTS
- 2 vCPU
- 4 GB RAM
- 40-80 GB SSD
- PostgreSQL
- reverse proxy
- HTTPS
- backup

The PDF noted this dimensioning was still subject to diagnosis and validation.

## 15. Deployment

Historical reference environments:

- development
- homologation
- pilot

The PDF required reverse proxy, backend, database and backup before pilot.

## 16. Pilot topology

Historical topology described:

- pilot unit
- browsers/PWA at the unit
- intermittent internet
- central reverse proxy
- Django/DRF
- PostgreSQL
- backup

## 17. Technological scope for the pilot

Historical pilot scope grouped:

- collection
- indicators
- connectivity-resilient operation
- records
- institutional workflow as TO-BE
- dashboard as TO-BE
- administration as TO-BE
- security
- infrastructure

## 18. Readiness

The PDF described five gates:

1. domain
2. product
3. infrastructure
4. operation
5. go-live

It explicitly stated that no go-live should happen without approval of all five gates.

## 19. Traceability with PROAFRICA

Historical traceability chain:

`problem -> requirement -> component -> test -> deliverable -> evidence`

Examples named in the PDF:

- fragile collection -> `FR-COL-*` -> collection components -> form tests -> executable local collection
- limited connectivity -> `FR-SYNC-*` -> IndexedDB/SyncEngine -> sync tests -> persistent queue
- duplication risk -> `FR-SYNC-004` -> `SyncBatchView` -> idempotency tests -> safe resubmission

## 20. Main ADRs

The PDF summarized these eight architectural decisions:

- `ADR-001` PostgreSQL
- `ADR-002` local-first persistence
- `ADR-003` Django/DRF
- `ADR-004` React/PWA
- `ADR-005` IndexedDB
- `ADR-006` session authentication
- `ADR-007` configurable indicators
- `ADR-008` idempotent synchronization

## 21. Main technical risks and platform limits

Historical risks:

- unstable connectivity
- data quality and completeness
- real pilot-unit infrastructure
- user adoption
- operational security
- backup and restore
- sync conflicts
- institutional versioning
- concentration of technical knowledge
- indicator changes over time

The PDF also explicitly recorded what the platform is not:

- not an electronic medical record
- not a LIS
- not a HIS
- not a complete hospital management system
- not individual donor or patient management
- not automated clinical decision support
- not a national rollout

## 22. Historical annex summary

The PDF ended with:

- critical requirements list
- ADR summary
- pilot readiness checklist reference
- condensed traceability matrix
- glossary with terms such as API, CSRF, DRF, INS, PWA, RBAC, RPO, RTO, UUID, IndexedDB and Sync Engine
