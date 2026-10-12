# MCP client setup

FinLLM exposes a **stdio MCP server** (`apps/mcp`) that proxies to the REST API. End users normally reach it through a **chat harness** (Cursor, Claude Code, Codex, OpenCode, Claude Desktop). See **[harness/README.md](../harness/README.md)** for skills, system prompt, and per-tool config examples.

**Prerequisites:** A running API (local or [deployment](deployment.md)), instance initialized, and a user-created MCP token. The web dashboard covers flows that MCP does not expose yet (CSV import UI, budget CRUD, reconciliation marks) — see [FEATURE_STATUS.md](FEATURE_STATUS.md).

## Build

```bash
pnpm --filter @finllm/mcp run build
```

## Generate a token

1. Sign in to the FinLLM web UI or API.
2. `POST /api/v1/mcp/tokens` with body, for example:
   - Read only: `{ "name": "cursor-read", "scopes": ["ledger.read"] }`
   - Read + post with confirm: `{ "name": "cursor-write", "scopes": ["ledger.read", "ledger.write"] }` and header **`X-Mcp-Write-Confirm: 1`**
3. Store the returned token securely; set `FINLLM_MCP_TOKEN` in your harness MCP env. Tokens expire after `MCP_TOKEN_DEFAULT_TTL_DAYS` (default 90). Revoke with `DELETE /api/v1/mcp/tokens/:id`; list with `GET /api/v1/mcp/tokens`.

## Cursor / Claude Desktop (stdio)

Example (also in `harness/config/cursor-mcp.json.example`):

```json
{
  "mcpServers": {
    "finllm": {
      "command": "node",
      "args": ["/path/to/FinLLM/apps/mcp/dist/index.js"],
      "env": {
        "MCP_API_URL": "http://localhost:3001",
        "FINLLM_MCP_TOKEN": "<token>"
      }
    }
  }
}
```

**Claude Code:** copy [`.mcp.json.example`](../.mcp.json.example) → `.mcp.json` in the repo root (do not commit tokens).

## Available tools (MVP)

| Tool | Scope | Description |
| ---- | ----- | ----------- |
| `list_accounts` | read | Accounts in the authenticated book |
| `get_balances` | read | Balances and net worth |
| `list_transactions` | read | Splits; optional `accountId`, `reconcileState`, `limit` |
| `preview_post_transaction` | write (preview) | Returns `confirmId` for a balanced transaction |
| `commit_post_transaction` | write | Commits preview using `confirmId` |

Mutations use server-side confirm tokens (`POST /api/v1/confirm/preview` and `/commit`). The harness should load skills **`finllm-chat-assistant`** and **`finllm-ledger-mutations`** (see `harness/skills/`).

## Threat model (summary)

- Treat MCP tokens like API keys; scope read vs write.
- The model must not be trusted to compute balances; always use tool output.
- See [SECURITY.md](../SECURITY.md).
