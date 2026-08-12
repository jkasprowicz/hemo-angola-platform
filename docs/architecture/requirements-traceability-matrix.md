# Requirements Traceability Matrix

| Requirement | Design | Implementation | Test | Status |
| --- | --- | --- | --- | --- |
| FR-AUTH-001 | ADR-006 Session Authentication | `LoginView`, `SessionView`, `LogoutView` | `AuthAndSyncFlowTests`, Playwright critical flow | IMPLEMENTED |
| FR-AUTH-002 | ADR-006 Session Authentication | `CsrfTokenView` | `test_csrf_endpoint_returns_cookie` | IMPLEMENTED |
| FR-CTX-001 | ADR-003 Django/DRF bootstrap API | `BootstrapView`, reporting-period window settings | `test_bootstrap_returns_demo_catalog` | IMPLEMENTED |
| FR-COL-001 | ADR-002 Local-first operation | `collectionService.startCollection`, `createCollection` | Playwright critical flow | IMPLEMENTED |
| FR-COL-002 | ADR-005 IndexedDB persistence | `putRecord`, `saveCollection`, `indexedDb.ts` | `submissionLocalRepository.test.ts`, Playwright reload assertions | IMPLEMENTED |
| FR-COL-004 | ADR-002 Local-first operation | `collectionService.closeCollection`, `closeCollection` | `syncEngine.test.ts`, form tests | IMPLEMENTED |
| FR-COL-005 | ADR-002 Local-first operation | `reopenCollection` | repository tests | IMPLEMENTED |
| FR-REC-001 | ADR-002 Local cycle separated from server submission | `LocalSubmissionRecord`, `Submission`, `SubmissionVersion` | Playwright critical flow | IMPLEMENTED |
| FR-SYNC-001 | ADR-002 Local-first operation | IndexedDB stores, local repository, sync page | Playwright offline flow | IMPLEMENTED |
| FR-SYNC-002 | ADR-008 Idempotent synchronization | `closeCollection` queue creation | `syncStore.test.ts`, repository tests | IMPLEMENTED |
| FR-SYNC-003 | ADR-008 Idempotent synchronization | `runSync`, `syncRemoteRepository.syncItems` | Playwright sync flow | IMPLEMENTED |
| FR-SYNC-004 | ADR-008 Idempotent synchronization | `SyncBatchView` with `get_or_create` and version lookup | `test_sync_persists_submission_data_and_is_idempotent` | IMPLEMENTED |
| FR-SYNC-005 | ADR-008 Idempotent synchronization | `markSyncError`, `getEligibleQueueItems` | `syncEngine.test.ts` | IMPLEMENTED |
| FR-SYNC-006 | ADR-008 Idempotent synchronization | `recoverInterruptedSyncs`, `hydrateSyncMeta` | `syncEngine.test.ts` | IMPLEMENTED |
| FR-SYNC-008 | ADR-002/ADR-008 with conflict policy | typed sync and submission conflict statuses only | No end-to-end test | GAP |
| FR-IND-001 | ADR-007 Configurable indicators | catalog engine local calculations; dashboard aggregations | `catalogEngine.test.ts`, dashboard tests | IMPLEMENTED PARTIALLY |
| FR-IND-002 | ADR-007 Configurable indicators | `CollectionModule`, `CollectionVariable`, `IndicatorDefinition` version fields | bootstrap test indirectly; no dedicated model test | IMPLEMENTED |
| FR-IND-004 | ADR-007 future indicator governance | no dedicated implementation yet | No test | TO-BE |
| FR-DASH-001 | ADR-007 Configurable indicators | `build_dashboard_payload`, `_latest_versions` | `test_uses_latest_version_per_submission` | IMPLEMENTED |
| FR-DASH-002 | ADR-007 Configurable indicators | `DashboardFilterSerializer`, dashboard UI filters | `test_filters_by_unit`, `test_filters_by_period_interval_using_reporting_period_order` | IMPLEMENTED |
| FR-DASH-003 | ADR-007 Configurable indicators | dashboard payload series and trace records | dashboard page tests, backend dashboard tests | IMPLEMENTED |
| FR-AUD-001 | ADR-003 + ADR-006 audit trail | `audit_service`, local event appenders | backend auth/sync tests | IMPLEMENTED |
| FR-AUD-002 | ADR-006 RBAC baseline | `CanViewAuditLog`, `AuditPage` | API permission behavior covered indirectly; no dedicated UI role test | IMPLEMENTED PARTIALLY |
| FR-ADM-002 | ADR-003 administrative baseline | Django Admin only | No dedicated test | IMPLEMENTED PARTIALLY |
| FR-ADM-003 | ADR-003 future institutional workflow | schema statuses, `accepted_data` model | No workflow test | TO-BE / DEPENDS ON INS |
| NFR-CONN-001 | ADR-002 Local-first + ADR-005 IndexedDB | IndexedDB, queue, sync engine | Playwright critical flow | IMPLEMENTED |
| NFR-SEC-001 | ADR-006 Session Authentication | Django session + CSRF endpoints | backend auth tests | IMPLEMENTED |
| NFR-REC-001 | ADR-005 IndexedDB | local stores and reload-safe repository | Playwright reload/reopen coverage | IMPLEMENTED |
| NFR-BKP-001 | ADR-001 PostgreSQL + infrastructure baseline | deployment runbooks only | Manual only | GAP FOR OPERATIONAL VALIDATION |
