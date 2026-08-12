# Functional Requirements

Status date: 2026-08-12

## AUTH

| ID | Title | Description | Priority | Status | Source | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| FR-AUTH-001 | Authenticate with Django session | The platform must allow a user to authenticate using username and password and receive a server session. | High | IMPLEMENTED | PDF v1.0; `backend/apps/core/views.py`; `backend/apps/core/tests.py` | Valid credentials create an authenticated session and `/api/auth/session/` returns `authenticated: true`. |
| FR-AUTH-002 | Provide CSRF bootstrap | The frontend must be able to fetch a CSRF cookie before login and state-changing requests. | High | IMPLEMENTED | `backend/apps/core/views.py`; `backend/apps/core/tests.py` | `GET /api/auth/csrf/` returns `200` and sets `csrftoken`. |
| FR-AUTH-003 | Explicit logout | Authenticated users must be able to end the current session explicitly. | High | IMPLEMENTED | PDF v1.0; `backend/apps/core/views.py`; Playwright `critical-flow.spec.ts` | Logout invalidates the session and protected routes redirect to `/login`. |

## CONTEXT

| ID | Title | Description | Priority | Status | Source | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| FR-CTX-001 | Bootstrap institution, unit and period | After login, the platform must return the user's institution, unit and reporting period context. | High | IMPLEMENTED | `backend/apps/core/views.py`; `backend/apps/core/tests.py` | `GET /api/bootstrap/` returns institution, unit, selected reporting period and available reporting periods. |
| FR-CTX-002 | Bootstrap demonstrative catalog | The platform must provide collection modules, variables and indicators in bootstrap payload. | High | IMPLEMENTED | `backend/apps/core/services.py`; `backend/apps/core/tests.py` | Bootstrap returns module, variable and indicator arrays populated from backend models. |
| FR-CTX-003 | Enforce reporting-period date policy | Reporting periods exposed to the client must respect configured past/future month windows. | Medium | IMPLEMENTED | `backend/hemo_angola/settings.py`; `backend/apps/core/views.py` | Bootstrap includes `reportingPeriodPolicy.minDate` and `maxDate` derived from settings. |

## COLLECTION

| ID | Title | Description | Priority | Status | Source | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| FR-COL-001 | Start collection only by explicit action | A new collection must only be created when the operator explicitly starts it. | High | IMPLEMENTED | PDF v1.0; `frontend/src/features/collections/services/collectionService.ts`; E2E tests | No collection record exists until the operator clicks start and `createCollection` runs. |
| FR-COL-002 | Persist draft locally while filling | Collection data must be stored locally while the operator fills the form. | High | IMPLEMENTED | PDF v1.0; `submissionLocalRepository.ts`; E2E tests | Saving updates the existing local record and data survives reload. |
| FR-COL-003 | Resume active collection | The operator must be able to continue an in-progress collection for the same unit and period. | High | IMPLEMENTED | `findActiveByContext`; E2E tests | Reloading or reopening the app allows the same active collection to continue. |
| FR-COL-004 | Close only when validation passes | A collection can be closed only if validation summary is valid. | High | IMPLEMENTED | PDF v1.0; `collectionService.closeCollection`; `submissionLocalRepository.closeCollection` | Closing an invalid collection raises an error and does not create a queue item. |
| FR-COL-005 | Reopen unsynced closed collection | A closed collection pending sync may be reopened before first successful sync. | Medium | IMPLEMENTED | `submissionLocalRepository.reopenCollection` | Reopen is allowed only for `closed + pending` records without `syncedAt`. |
| FR-COL-006 | Update reporting period during active collection | Operators may change the reporting period only while the collection is still editable. | Medium | IMPLEMENTED | `submissionLocalRepository.updateReportingPeriod` | Attempting to change period after close or receipt returns an error. |
| FR-COL-007 | Update collection date within the selected period | The collection date must be editable while the collection is active and must remain within period policy. | Medium | IMPLEMENTED PARTIALLY | `collectionService.isCollectionDateWithinPeriod`; backend sync serializer validation | Client supports date update and server rejects sync payload outside the period; no server-side draft API exists. |
| FR-COL-008 | Delete unsynced local-only collection | The operator may delete a collection that has never been synchronized. | Medium | IMPLEMENTED | `submissionLocalRepository.deleteLocalCollection` | Records already synced or marked received cannot be deleted locally. |

## RECORDS

| ID | Title | Description | Priority | Status | Source | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| FR-REC-001 | Represent each real collection cycle as one record | Each record must correspond to one collection cycle for one unit and one reporting period. | High | IMPLEMENTED | PDF v1.0; `LocalSubmissionRecord`; `Submission` model | Record payload stores unit, reporting period, cycle UUID and collection metadata. |
| FR-REC-002 | List local records with filters | The platform must list records by collection status, sync status and reporting period. | Medium | IMPLEMENTED | `submissionLocalRepository.listRecords`; records pages | Filtering is available by provided optional fields and results are sorted by update time. |
| FR-REC-003 | Show detailed record history | The platform must expose detailed event history for a local record. | Medium | IMPLEMENTED | `getAuditEvents`; record detail page paths; audit event types | Event history is stored and retrievable ordered by occurrence timestamp. |

## SYNC

| ID | Title | Description | Priority | Status | Source | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| FR-SYNC-001 | Persist locally before central transmission | The collection workflow must persist locally before any attempt to send data to the server. | High | IMPLEMENTED | PDF v1.0; IndexedDB storage; E2E tests | A collection can be created, edited and closed while offline and still be available later for sync. |
| FR-SYNC-002 | Create a persistent sync queue on close | Closing a valid collection must create a queue item for later sync. | High | IMPLEMENTED | `submissionLocalRepository.closeCollection` | A queue item with UUIDs, version number and retry metadata is created on close. |
| FR-SYNC-003 | Send selected queued items | The user must be able to synchronize selected eligible items. | High | IMPLEMENTED | `runSync`; sync page; Playwright tests | Sync page can select records and successfully post them to `/api/sync/`. |
| FR-SYNC-004 | Ensure idempotent technical receipt | Resending the same submission/version must not duplicate server data. | High | IMPLEMENTED | PDF v1.0; `SyncBatchView`; `backend/apps/core/tests.py` | Reposting the same payload keeps one `Submission` and one `SubmissionVersion`, with `idempotent: true` on replay. |
| FR-SYNC-005 | Retry failed sync with backoff | Failed sync items must remain queued and become eligible again after a backoff interval. | High | IMPLEMENTED | `markSyncError`; `getEligibleQueueItems` | Failed items store `nextAttemptAt` and become eligible when that timestamp is reached. |
| FR-SYNC-006 | Recover interrupted syncs on restart | The app must recover records left in `syncing` state after interruption. | Medium | IMPLEMENTED | `recoverInterruptedSyncs`; `hydrateSyncMeta` | On startup, orphaned `syncing` records are converted to `error` and queue items become retryable. |
| FR-SYNC-007 | Validate collection date against reporting period on receipt | The server must reject sync payloads whose collection date falls outside the selected period. | High | IMPLEMENTED | `SyncItemSerializer.validate` | Sync request outside the reporting period returns validation error. |
| FR-SYNC-008 | Surface conflict handling | The platform must support a visible conflict workflow when concurrent or semantic conflicts occur. | High | GAP | PDF v1.0; typed statuses only | Current code defines conflict statuses but does not implement end-to-end conflict detection or resolution. |

## INDICATORS

| ID | Title | Description | Priority | Status | Source | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| FR-IND-001 | Calculate indicators from base data | Calculated indicators must derive from collected base variables instead of manual entry. | High | IMPLEMENTED PARTIALLY | PDF v1.0; catalog engine; dashboard services | Client and dashboard calculate indicator values from response totals; no generic formula engine exists yet. |
| FR-IND-002 | Version collection modules and variables | Catalog entities must support versioning and validity windows. | Medium | IMPLEMENTED | `CollectionModule`; `CollectionVariable`; `IndicatorDefinition` models | Catalog tables contain `version`, `valid_from` and `valid_to`. |
| FR-IND-003 | Provide indicator metadata in bootstrap | Indicator definition metadata must be available to the frontend together with numerator and denominator mapping. | Medium | IMPLEMENTED | serializers and bootstrap response | Bootstrap includes indicator codes, formula kinds and linked variable metadata. |
| FR-IND-004 | Support administratively managed indicator builder | The platform should provide a dedicated administrative builder for future indicator governance. | Medium | TO-BE | PDF v1.0 future direction | No admin workflow or UI for indicator authoring exists today. |

## DASHBOARD

| ID | Title | Description | Priority | Status | Source | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| FR-DASH-001 | Aggregate latest received versions per submission | Dashboard calculations must use the latest received version per submission. | High | IMPLEMENTED | `dashboard/services.py`; dashboard tests | Dashboard tests confirm only the latest version contributes to aggregates. |
| FR-DASH-002 | Filter dashboard by unit and period range | Dashboard users must filter by unit and reporting-period interval. | High | IMPLEMENTED | `DashboardFilterSerializer`; tests; dashboard page | API accepts unit and period interval filters and returns scoped aggregates. |
| FR-DASH-003 | Show indicator trends and traceability | Dashboard should expose per-period series and trace records for the consolidated data. | Medium | IMPLEMENTED | `build_dashboard_payload`; dashboard UI | Response includes series points, base data and trace records for each period. |

## AUDIT

| ID | Title | Description | Priority | Status | Source | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| FR-AUD-001 | Record authentication and sync audit events | The platform must record auditable events for auth and synchronization. | High | IMPLEMENTED | `audit_service`; auth/sync tests | Login, logout, sync start and technical receipt produce audit events. |
| FR-AUD-002 | Restrict central audit viewing to authorized roles | Only manager/admin roles may view central audit event listings. | High | IMPLEMENTED | `CanViewAuditLog`; `AuditPage.tsx` | Unauthorized users cannot access central audit API or useful UI data. |
| FR-AUD-003 | Preserve local event history per record | The client must preserve a record-level event trail with correlation IDs and before/after payloads. | Medium | IMPLEMENTED | `RecordEvent`; local repository | Local record history includes correlation ID, actor, before and after metadata. |

## ADMIN AND GOVERNANCE

| ID | Title | Description | Priority | Status | Source | Acceptance criteria |
| --- | --- | --- | --- | --- | --- | --- |
| FR-ADM-001 | Maintain demo baseline data | The repository must be able to seed demonstrative institution, users, periods and catalog data. | Medium | IMPLEMENTED | `ensure_demo_data`; management command | Running the seed command creates consistent demo users, periods and catalog data. |
| FR-ADM-002 | Provide dedicated functional administration console | Functional administrators should manage users, units, periods and parameters in an application console. | High | IMPLEMENTED PARTIALLY | PDF v1.0; Django Admin presence | Django Admin exists, but a domain-specific admin console is not implemented. |
| FR-ADM-003 | Support institutional review and acceptance | Reviewer/manager workflow must support return, acceptance and consolidation. | High | TO-BE / DEPENDS ON INS | PDF v1.0; schema hints only | Roles and statuses exist, but review rules and UI/API flow are not implemented. |
