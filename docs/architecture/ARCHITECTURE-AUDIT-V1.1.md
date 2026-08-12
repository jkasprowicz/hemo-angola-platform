# Architecture Audit v1.1

Date: 2026-08-12  
Comparison: historical specification v1.0 versus repository state

## Executive summary

The repository already implements the core local-first collection flow, central technical receipt, session security, audit trail and a first dashboard slice. The main differences relative to v1.0 are not regressions in the implemented core, but incomplete pilot-governance capabilities that the historical document already positioned as planned or dependent on INS validation.

## Audit classification

| Area | v1.0 expectation | Current repository state | Classification | Evidence |
| --- | --- | --- | --- | --- |
| Authentication | session auth, CSRF, login/logout | implemented and tested | IMPLEMENTED | `core/views.py`, `core/tests.py` |
| RBAC | basic roles now, final policy later | roles exist on `UserProfile`; audit access restricted to manager/admin | IMPLEMENTED PARTIALLY | `core/models.py`, `CanViewAuditLog` |
| Collection | explicit start, save, continue, validate, close | implemented locally with IndexedDB | IMPLEMENTED | collection services, local repository, E2E |
| Multi-collection continuity | recover same active cycle by unit and period | implemented | IMPLEMENTED | `findActiveByContext`, mobile report, E2E |
| Local persistence | IndexedDB persistence and reload recovery | implemented | IMPLEMENTED | `indexedDb.ts`, tests |
| Sync queue | persistent queue with retry/backoff | implemented | IMPLEMENTED | queue store, `markSyncError`, `getEligibleQueueItems` |
| Idempotent sync | safe resubmission without duplication | implemented | IMPLEMENTED | `SyncBatchView`, backend tests |
| Conflict handling | conflict path acknowledged | statuses exist, but no full policy/workflow | GAP | typed statuses only |
| Technical receipt | received-by-server status | implemented | IMPLEMENTED | sync API, frontend `markSynced` |
| Institutional review | reviewer flow, return, accept | not implemented end-to-end | TO-BE / DEPENDS ON INS | schema hints only |
| Accepted data | accepted layer after review | data model exists, workflow absent | IMPLEMENTED PARTIALLY | `accepted_data` app |
| Consolidation | central consolidation | structural app exists, no implemented flow | TO-BE | `consolidation` app skeleton |
| Dashboard | planned for pilot in v1.0 | MVP dashboard already implemented for three indicators | IMPLEMENTED PARTIALLY AHEAD OF v1.0 TEXT | dashboard backend/frontend/tests |
| Indicator catalog | configurable and versioned | demonstrative versioned catalog implemented | IMPLEMENTED PARTIALLY | demo seed, models |
| Formula engine | safe generalized formula layer | not implemented as generic engine | TO-BE | current calculations are explicit code |
| Auditability | minimal audit trail | implemented on client and server | IMPLEMENTED | audit models/services |
| HTTPS/proxy baseline | mandatory for pilot | documented and configurable, not validated in real pilot infra | IMPLEMENTED PARTIALLY | deploy docs, settings |
| PostgreSQL central store | main persistent store | implemented | IMPLEMENTED | settings, compose, readiness docs |
| Backup/restore | required before pilot | manual runbook exists; operational proof pending | IMPLEMENTED PARTIALLY | deployment docs |
| Responsiveness | usable on mobile | responsive code exists and a mobile quality report exists | IMPLEMENTED PARTIALLY | frontend layouts, `docs/quality` report |

## Domain-specific findings

### Dashboard

v1.0 described dashboard as planned for pilot. The repository has moved beyond that baseline by implementing:

- weighted aggregation from received versions
- unit and period filters
- temporal series
- trace records attached to dashboard points

This is progress beyond the historical document, but still not a full institutional analytics product.

### Multiple collections and dates

The repository strongly enforces the operational anchor of `unit + reporting period`. It also added concrete reporting-period date windows and server-side validation of collection dates during sync receipt. This is aligned with the architectural intent and more concrete than the historical baseline.

### Audit

Audit evolved materially relative to early historical baseline:

- server events now carry public IDs, actor identity fields, correlation IDs, source, IP/user-agent metadata and before/after payloads
- client-side event history mirrors the operational lifecycle in IndexedDB

### Workflow and governance

The major remaining gap is institutional workflow:

- reviewer flow is not implemented
- accepted and returned statuses are not surfaced as a complete process
- conflict resolution policy is not operational
- admin console remains generic Django Admin instead of a domain UI

## Architectural conclusions

1. The repository is already a real local-first prototype, not just a paper design.
2. The current architecture is coherent with v1.0 in its core technical choices.
3. The biggest risk area is not collection or sync, but governance workflow completion for pilot readiness.
4. The current code supports a central cloud model; prolonged disconnected multi-user operation would require a separate edge pattern evaluation.

## Recommended priorities after this documentary sprint

1. Formalize institutional workflow with INS-approved statuses and acceptance rules.
2. Decide whether conflict handling remains manual or becomes API-enforced optimistic concurrency.
3. Decide whether the pilot remains device-local plus cloud or needs a local edge node.
4. Replace demonstrative indicator governance with controlled administrative authoring and version lifecycle.
