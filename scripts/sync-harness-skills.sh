#!/usr/bin/env bash
# Mirror harness/skills/*/SKILL.md → .cursor/skills/ for Cursor project discovery.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HEADER="<!-- Synced from harness/skills by scripts/sync-harness-skills.sh — edit canonical file there. -->"
for skill_dir in "$ROOT"/harness/skills/finllm-*/; do
  name="$(basename "$skill_dir")"
  src="$skill_dir/SKILL.md"
  [[ -f "$src" ]] || continue
  dest_dir="$ROOT/.cursor/skills/$name"
  mkdir -p "$dest_dir"
  {
    echo "$HEADER"
    echo ""
    cat "$src"
  } > "$dest_dir/SKILL.md"
  echo "synced $name"
done
echo "Done. Registry: harness/skills/registry.json"
