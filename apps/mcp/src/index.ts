import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.MCP_API_URL ?? "http://localhost:3001";
const MCP_TOKEN = process.env.FINLLM_MCP_TOKEN ?? "";

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (MCP_TOKEN) h.Authorization = `Bearer ${MCP_TOKEN}`;
  return h;
}

async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

const server = new McpServer({
  name: "finllm",
  version: "0.1.0",
});

server.tool(
  "list_accounts",
  "List financial accounts for the authenticated book (read-only).",
  {},
  async () => {
    const data = await apiGet("/api/v1/accounts");
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
);

server.tool(
  "get_balances",
  "Get account balances and net worth in book currency (read-only).",
  {},
  async () => {
    const data = await apiGet("/api/v1/balances");
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
);

server.tool(
  "list_transactions",
  "List posted transaction splits; optional accountId and reconcileState filter.",
  {
    accountId: z.string().uuid().optional(),
    reconcileState: z.enum(["UNCLEARED", "CLEARED", "RECONCILED"]).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  async ({ accountId, reconcileState, limit }) => {
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (reconcileState) params.set("reconcileState", reconcileState);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    const data = await apiGet(`/api/v1/transactions${qs ? `?${qs}` : ""}`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
);

const splitSchema = z.object({
  accountId: z.string().uuid(),
  debitMinor: z.string(),
  creditMinor: z.string(),
});

server.tool(
  "preview_post_transaction",
  "Create a server-side confirmation preview for posting a balanced transaction (requires ledger.write token at commit).",
  {
    txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().optional(),
    externalRef: z.string().optional(),
    idempotencyKey: z.string().optional(),
    splits: z.array(splitSchema).min(2),
  },
  async (input) => {
    const preview = {
      txnDate: input.txnDate,
      description: input.description,
      externalRef: input.externalRef,
      idempotencyKey: input.idempotencyKey,
      splits: input.splits,
    };
    const data = await apiPost("/api/v1/confirm/preview", {
      operation: "post_transaction",
      preview,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ message: "Review preview; call commit_post_transaction with confirmId", ...data, preview }, null, 2),
        },
      ],
      structuredContent: { ...data, preview },
    };
  },
);

server.tool(
  "commit_post_transaction",
  "Commit a previously previewed transaction using confirmId (ledger.write scope required).",
  { confirmId: z.string().uuid() },
  async ({ confirmId }) => {
    const data = await apiPost("/api/v1/confirm/commit", { confirmId });
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
