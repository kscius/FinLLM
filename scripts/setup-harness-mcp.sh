#!/usr/bin/env bash
# Print absolute MCP path and remind how to wire harness config (no secrets written).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MCP_JS="$ROOT/apps/mcp/dist/index.js"
echo "FinLLM MCP entry (build first: pnpm --filter @finllm/mcp run build):"
echo "  $MCP_JS"
echo ""
echo "Examples:"
echo "  harness/config/cursor-mcp.json.example"
echo "  harness/config/claude-desktop-mcp.json.example"
echo "  .mcp.json.example  (Claude Code — copy to .mcp.json locally)"
echo ""
echo "Skills: harness/skills/  |  Cursor: .cursor/skills/finllm-*"
echo "Guide:  harness/README.md"
