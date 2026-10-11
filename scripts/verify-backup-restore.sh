#!/usr/bin/env bash
# Smoke test: backup and restore against DATABASE_URL (requires pg_dump/psql).
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
BACKUP="$TMP/finllm-test.sql.gz"
export DATABASE_URL
"$ROOT/scripts/backup-db.sh" "$BACKUP"
psql_cmd() {
  if command -v psql >/dev/null 2>&1; then
    psql "$DATABASE_URL" "$@"
  else
    (cd "$ROOT" && docker compose exec -T postgres psql -U finllm finllm "$@")
  fi
}
TABLES_BEFORE="$(psql_cmd -Atc "select count(*) from information_schema.tables where table_schema='public'")"
psql_cmd -c "drop schema if exists drizzle cascade; drop schema public cascade; create schema public;" >/dev/null
"$ROOT/scripts/restore-db.sh" "$BACKUP"
TABLES_AFTER="$(psql_cmd -Atc "select count(*) from information_schema.tables where table_schema='public'")"
rm -rf "$TMP"
if [[ "$TABLES_BEFORE" != "$TABLES_AFTER" ]]; then
  echo "Table count mismatch before=$TABLES_BEFORE after=$TABLES_AFTER" >&2
  exit 1
fi
echo "Backup/restore OK (tables=$TABLES_AFTER)"
