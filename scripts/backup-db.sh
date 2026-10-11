#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL}"
OUT="${1:-./backups/finllm-$(date +%Y%m%d-%H%M%S).sql.gz}"
mkdir -p "$(dirname "$OUT")"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DATABASE_URL" | gzip > "$OUT"
elif (cd "$ROOT" && docker compose ps postgres 2>/dev/null | grep -q "Up"); then
  (cd "$ROOT" && docker compose exec -T postgres pg_dump -U finllm finllm) | gzip > "$OUT"
else
  echo "pg_dump not found; start Postgres (docker compose up postgres -d) or install client tools." >&2
  exit 1
fi
echo "Wrote $OUT"
