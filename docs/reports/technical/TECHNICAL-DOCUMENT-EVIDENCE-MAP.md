# Technical Document Evidence Map

Data de geração: 2026-08-12

## Finalidade

Este arquivo relaciona afirmações centrais da documentação técnica consolidada às evidências internas do repositório. Ele não substitui o código como fonte primária do estado atual.

| Afirmação | Classificação | Evidência principal |
| --- | --- | --- |
| O sistema usa autenticação por sessão Django com CSRF | IMPLEMENTADO | `backend/apps/core/views.py`, `backend/apps/core/tests.py`, `frontend/src/lib/api/httpClient.ts` |
| O frontend carrega contexto por instituição, unidade, período e catálogo | IMPLEMENTADO | `backend/apps/core/views.py`, `backend/apps/core/tests.py` |
| A coleta só é criada por ação explícita | IMPLEMENTADO | `frontend/src/routes/HomePage.tsx`, `frontend/src/features/collections/services/collectionService.ts`, Playwright `critical-flow.spec.ts` |
| O sistema persiste coletas localmente em IndexedDB | IMPLEMENTADO | `frontend/src/lib/storage/indexedDb.ts`, `submissionLocalRepository.ts`, E2E |
| O sistema sobrevive a reload no mesmo dispositivo | IMPLEMENTADO | Playwright `critical-flow.spec.ts`, `indexedDb.ts` |
| O sistema possui fila persistente de sincronização | IMPLEMENTADO | `frontend/src/repositories/local/submissionLocalRepository.ts`, `frontend/src/lib/sync/syncEngine.ts` |
| Há retry e backoff após falha de sincronização | IMPLEMENTADO | `markSyncError`, `getEligibleQueueItems` em `submissionLocalRepository.ts` |
| A sincronização é idempotente no backend | IMPLEMENTADO | `backend/apps/submissions/views.py`, `test_sync_persists_submission_data_and_is_idempotent` |
| Há recuperação de sincronização interrompida | IMPLEMENTADO | `recoverInterruptedSyncs` em `submissionLocalRepository.ts`, `hydrateSyncMeta` em `syncEngine.ts` |
| O dashboard está implementado no protótipo | IMPLEMENTADO PARTIALLY | `backend/apps/dashboard/views.py`, `backend/apps/dashboard/services.py`, `frontend/src/features/dashboard/pages/DashboardPage.tsx`, testes de dashboard |
| O dashboard usa três indicadores atuais | IMPLEMENTADO PARTIALLY | `backend/apps/core/services.py`, `backend/apps/dashboard/services.py` |
| Os indicadores atuais são demonstrativos | IMPLEMENTADO PARTIALLY | avisos em `backend/apps/core/services.py`, `frontend/src/features/collections/pages/CollectionPage.tsx`, `core/tests.py` |
| Existe baseline de deploy com Nginx, Gunicorn e PostgreSQL | IMPLEMENTADO | `docker-compose.prod.yml`, `deploy/nginx/hemo-angola.conf.example`, `deploy/systemd/hemo-angola-gunicorn.service.example`, `docs/deployment/README.md` |
| Há documentação de backup e restore | IMPLEMENTADO PARTIALLY | `docs/deployment/BACKUP-AND-RESTORE.md` |
| Há healthcheck de backend e banco | IMPLEMENTADO | `backend/apps/core/views.py`, compose healthchecks |
| Há trilha de auditoria no backend e no cliente | IMPLEMENTADO PARTIALLY | `backend/apps/submissions/models.py`, `backend/apps/submissions/views.py`, `frontend/src/repositories/local/submissionLocalRepository.ts`, `frontend/src/services/auditService.ts` |
| RBAC existe apenas parcialmente | IMPLEMENTADO PARTIALLY | `backend/apps/core/models.py`, `CanViewAuditLog`, `frontend/src/routes/AuditPage.tsx` |
| Workflow institucional completo ainda não está implementado | TO-BE / DEPENDE DO INS | `docs/architecture/ARCHITECTURE-AUDIT-V1.1.md`, modelos com statuses sem fluxo completo, ausência de APIs/UX correspondentes |
| Resolução de conflitos ainda é gap | GAP | `docs/architecture/offline/CONFLICT-RESOLUTION.md`, statuses tipados sem fluxo end-to-end |
| Edge node local é uma alternativa proposta, não implementada | PROPOSTO | `docs/architecture/offline/LOCAL-EDGE-OPTION.md`, ausência de implementação em código |
| Indicator Builder é evolução proposta | PROPOSTO | `docs/architecture/indicators/INDICATOR-BUILDER-SPEC.md`, ausência de interface ou endpoints dedicados |
| Formula Engine genérico é evolução proposta | PROPOSTO | `docs/architecture/indicators/FORMULA-ENGINE.md`, ausência de engine genérico no código |

## Divergências relevantes entre documentação e código

1. A especificação histórica v1.0 tratava dashboard como planejado para o piloto, mas o repositório atual já possui dashboard MVP implementado.
2. O modelo de tipos do frontend inclui estados como `accepted`, `rejected` e `ready_for_review`, porém o fluxo institucional completo correspondente não está implementado.
3. A documentação histórica prevê revisão e aceite institucionais; o código atual evidencia principalmente recebimento técnico e trilha de auditoria.

## Afirmações evitadas por falta de confirmação

- existência de ambiente definitivo do INS em produção;
- implantação confirmada em AWS EC2;
- domínio público final validado;
- matriz oficial de indicadores validada pelo INS;
- operação multiusuário offline compartilhada;
- validação operacional recorrente de restore.
