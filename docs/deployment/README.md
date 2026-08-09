# HEMO-ANGOLA Deployment Readiness

Este repositório está preparado para uma demo em VPS Linux com arquitetura same-origin:

- `https://demo.exemplo.com/` serve o frontend Vite compilado
- `https://demo.exemplo.com/api/` faz proxy para Django + Gunicorn
- PostgreSQL é o banco obrigatório de produção

## Opção recomendada para a primeira demo

Fluxo manual com:

- Nginx
- Gunicorn
- PostgreSQL
- `systemd`

Essa opção mantém a operação simples, facilita logs e evita misturar contêineres de desenvolvimento com runtime de produção.

## Variáveis obrigatórias

Copie `.env.example` para `.env` e ajuste ao menos:

- `DJANGO_ENV=production`
- `DJANGO_SECRET_KEY`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`

Variáveis de hardening que podem ser habilitadas na demo:

- `DJANGO_SECURE_PROXY_SSL_HEADER=True`
- `DJANGO_SESSION_COOKIE_SECURE=True`
- `DJANGO_CSRF_COOKIE_SECURE=True`
- `DJANGO_SECURE_SSL_REDIRECT=True`

`DJANGO_SECURE_HSTS_SECONDS` deve começar em `0` ou um valor baixo na primeira publicação pública, até o domínio e o HTTPS estarem estáveis.

## Fluxo de deploy manual

1. Atualize o código: `git pull`
2. Atualize dependências Python: `pip install -r backend/requirements.txt`
3. Atualize dependências frontend: `npm ci --prefix frontend`
4. Gere o build do frontend: `npm run build --prefix frontend`
5. Execute migrações: `python backend/manage.py migrate`
6. Colete estáticos: `python backend/manage.py collectstatic --noinput`
7. Se precisar de usuário demo, rode `python backend/manage.py seed_demo_data --demo-password '<senha-forte>'`
8. Reinicie o Gunicorn: `systemctl restart hemo-angola-gunicorn`
9. Recarregue o Nginx: `systemctl reload nginx`

## Checklist de publicação

- `python backend/manage.py check`
- `python backend/manage.py check --deploy`
- `python backend/manage.py test`
- `npm run lint --prefix frontend`
- `npm run typecheck --prefix frontend`
- `npm run test --prefix frontend`
- `npm run build --prefix frontend`

## Docker Compose

`docker-compose.yml` permanece como ambiente de desenvolvimento.

`docker-compose.prod.yml` é um baseline de produção para demonstração, assumindo:

- `frontend/dist` já gerado no host
- `collectstatic` executado antes de subir os serviços
- segredo e credenciais providos por `.env`

Evite rodar migrações destrutivas automaticamente no `startup` de produção.
