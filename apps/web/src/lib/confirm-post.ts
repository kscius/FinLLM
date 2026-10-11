import { api } from "./api.js";

export type TransactionPreview = {
  txnDate: string;
  description?: string;
  externalRef?: string;
  idempotencyKey?: string;
  splits: Array<{ accountId: string; debitMinor: string; creditMinor: string }>;
};

/** Post a transaction through preview + confirm (same flow as MCP writes). */
export async function postTransactionViaConfirm(preview: TransactionPreview) {
  const { confirmId } = await api<{ confirmId: string }>("/api/v1/confirm/preview", {
    method: "POST",
    body: JSON.stringify({ operation: "post_transaction", preview }),
  });
  return api("/api/v1/confirm/commit", {
    method: "POST",
    body: JSON.stringify({ confirmId }),
  });
}
