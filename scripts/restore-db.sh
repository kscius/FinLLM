#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL}"
FILE="${1:?Usage: restore-db.sh backup.sql.gz}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if command -v psql >/dev/null 2>&1; then
  gunzip -c "$FILE" | psql "$DATABASE_URL"
elif (cd "$ROOT" && docker compose ps postgres 2>/dev/null | grep -q "Up"); then
  gunzip -c "$FILE" | (cd "$ROOT" && docker compose exec -T postgres psql -U finllm finllm)
else
  echo "psql not found; start Postgres (docker compose up postgres -d) or install client tools." >&2
  exit 1
fi
echo "Restore complete"
