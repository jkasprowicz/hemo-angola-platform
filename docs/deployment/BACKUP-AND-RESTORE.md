# PostgreSQL Backup and Restore

## Objetivo

Fornecer um procedimento mínimo e manual para backup e restauração da base demo.

## Diretório recomendado

Armazene dumps fora do diretório do app, por exemplo:

- `/srv/backups/hemo-angola/`

## Backup manual

Exemplo com `pg_dump`:

```bash
export PGPASSWORD='<postgres-password>'
pg_dump \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=custom \
  --file="/srv/backups/hemo-angola/hemo-angola-$(date +%F-%H%M).dump"
```

## Restore manual

1. Confirme que o destino é o banco correto.
2. Faça backup do estado atual antes do restore.
3. Restaure em janela controlada.

Exemplo:

```bash
export PGPASSWORD='<postgres-password>'
dropdb --if-exists --host="$POSTGRES_HOST" --port="$POSTGRES_PORT" --username="$POSTGRES_USER" "$POSTGRES_DB"
createdb --host="$POSTGRES_HOST" --port="$POSTGRES_PORT" --username="$POSTGRES_USER" "$POSTGRES_DB"
pg_restore \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --clean \
  --if-exists \
  "/srv/backups/hemo-angola/arquivo.dump"
```

## Teste de restauração

Para a demo, teste periodicamente um restore em banco temporário antes de depender do dump:

```bash
export PGPASSWORD='<postgres-password>'
createdb --host="$POSTGRES_HOST" --port="$POSTGRES_PORT" --username="$POSTGRES_USER" hemo_angola_restore_test
pg_restore \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="hemo_angola_restore_test" \
  "/srv/backups/hemo-angola/arquivo.dump"
dropdb --host="$POSTGRES_HOST" --port="$POSTGRES_PORT" --username="$POSTGRES_USER" hemo_angola_restore_test
```
