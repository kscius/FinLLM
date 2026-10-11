# MCP client setup

## Generate a token

1. Sign in to the FinLLM web UI or API.
2. `POST /api/v1/mcp/tokens` with body `{ "name": "cursor", "scopes": ["ledger.read"] }`.
3. Store the returned token securely.

## Cursor / Claude Desktop (stdio)

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

Build the MCP app first: `pnpm --filter @finllm/mcp run build`.

## Available tools (MVP)

- `list_accounts` — read-only
- `get_balances` — read-only
- `search_transactions` — placeholder (balances snapshot)

Mutating tools require server-side confirmation tokens (see API `/api/v1/confirm/preview`).
