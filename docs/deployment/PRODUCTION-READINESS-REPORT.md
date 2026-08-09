# Production Readiness Report

Data da auditoria: 2026-08-09

## Escopo auditado

- `backend/`
- `frontend/`
- `docker-compose.yml`
- `.env.example`
- `.gitignore`

## Resumo executivo

O MVP já possuía base razoável para demo com PostgreSQL, healthcheck e frontend consumindo `/api/`.

Os principais gaps encontrados antes desta fase eram:

- `settings.py` com defaults inseguros para produção e sobrescrita indevida de `CSRF_TRUSTED_ORIGINS`
- senha demo hardcoded no backend, no frontend e nos testes E2E
- ausência de artefatos versionáveis de `nginx`, `systemd`, `gunicorn` e documentação operacional
- `docker-compose.yml` orientado a desenvolvimento, sem separação explícita para produção
- `.env.example` incompleto para hardening HTTPS/proxy/logging

## Achados da auditoria

### Segredos e arquivos sensíveis

- Nenhum `.env` real estava versionado.
- Nenhum `node_modules/`, `.venv/` ou `test.sqlite3` estava rastreado pelo Git.
- Foram encontrados artefatos locais não versionados no workspace:
  - `frontend/node_modules/`
  - `backend/.venv/`
  - `backend/test.sqlite3`
- Não foram encontrados dumps de banco versionados.

### Riscos corrigidos nesta fase

- `DJANGO_SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` e credenciais de banco passaram a ser lidos por ambiente.
- Produção agora falha cedo se `DJANGO_SECRET_KEY` ou `DJANGO_ALLOWED_HOSTS` estiverem ausentes.
- Cookies seguros, `SECURE_PROXY_SSL_HEADER`, redirect SSL, HSTS e logging mínimo passaram a ter suporte por ambiente.
- O endpoint `GET /api/health/` foi reduzido para resposta mínima sem detalhes operacionais extras.
- O seed demo passou a exigir `DJANGO_DEMO_PASSWORD` ou `--demo-password`.
- O frontend deixou de exibir senha demo fixa no bundle.

## Estado atual por área

### Backend

- Pronto para `development` e `production` por variáveis de ambiente.
- PostgreSQL é o backend padrão fora dos testes SQLite.
- `collectstatic` está suportado com `STATIC_ROOT`.
- `gunicorn hemo_angola.wsgi:application` está pronto com configuração baseline em `backend/gunicorn.conf.py`.

### Frontend

- Build de produção continua gerando `frontend/dist/`.
- Consumo da API já ocorre com caminho relativo `/api/`, adequado para same-origin via Nginx.
- A configuração de Vite permanece com proxy somente para desenvolvimento.

### Infra e operação

- `docker-compose.yml` deve ser tratado como desenvolvimento.
- `docker-compose.prod.yml` foi adicionado como baseline de produção demonstrativa.
- Exemplos de Nginx e `systemd` foram adicionados em `deploy/`.
- Documentação de deploy e backup foi adicionada em `docs/deployment/`.

## Warnings e observações

- `DJANGO_SECURE_HSTS_SECONDS` deve começar em valor conservador na primeira demo pública.
- `DJANGO_CORS_ALLOWED_ORIGINS` só deve ser preenchido em produção se o frontend não estiver em same-origin.
- O fluxo de criação de usuário demo agora depende de variável ou argumento explícito; isso é intencional para evitar credencial fixa em código.

## Validação executada

- `python3 backend/manage.py check`: OK
- `python3 backend/manage.py check --deploy`: warnings esperados em simulação com `DEBUG=True`, cookies inseguros e HTTPS ainda não forçado
- `python3 manage.py test` em `backend/`: OK, 25 testes
- `npm run lint` em `frontend/`: OK
- `npm run typecheck` em `frontend/`: OK
- `npm test` em `frontend/`: OK, 30 testes
- `npm run build` em `frontend/`: OK

Observação do build frontend:

- o Vite reportou chunk principal acima de 500 kB após minificação; não bloqueia a demo, mas merece futura revisão de code-splitting

## Próximos passos antes do deploy real

1. Definir domínio e popular `DJANGO_ALLOWED_HOSTS` e `DJANGO_CSRF_TRUSTED_ORIGINS` com valores HTTPS reais.
2. Gerar `DJANGO_SECRET_KEY` e senha forte para PostgreSQL.
3. Executar o checklist de validação descrito em `docs/deployment/README.md`.
4. Testar smoke flow completo atrás de Nginx com `DEBUG=False`.
