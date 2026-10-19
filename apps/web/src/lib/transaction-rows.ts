import type { AccountRow } from "./types.js";

export type TransactionSplitItem = {
  transactionId: string;
  txnDate: string;
  description: string | null;
  kind: string;
  status: string;
  splitId: string;
  accountId: string;
  debitMinor: string;
  creditMinor: string;
  reconcileState: string;
  memo: string | null;
};

export type GroupedTransaction = {
  transactionId: string;
  txnDate: string;
  description: string | null;
  kind: string;
  status: string;
  splits: TransactionSplitItem[];
};

export function groupTransactionItems(items: TransactionSplitItem[]): GroupedTransaction[] {
  const byId = new Map<string, GroupedTransaction>();
  for (const row of items) {
    let group = byId.get(row.transactionId);
    if (!group) {
      group = {
        transactionId: row.transactionId,
        txnDate: row.txnDate,
        description: row.description,
        kind: row.kind,
        status: row.status,
        splits: [],
      };
      byId.set(row.transactionId, group);
    }
    group.splits.push(row);
  }
  return [...byId.values()].sort((a, b) => (a.txnDate < b.txnDate ? 1 : a.txnDate > b.txnDate ? -1 : 0));
}

export function headlineAmountMinor(
  txn: GroupedTransaction,
  accountById: Map<string, AccountRow>,
): bigint {
  let expense = 0n;
  let income = 0n;
  let assetFlow = 0n;

  for (const s of txn.splits) {
    const acc = accountById.get(s.accountId);
    if (!acc) continue;
    const debit = BigInt(s.debitMinor);
    const credit = BigInt(s.creditMinor);
    if (acc.type === "EXPENSE") expense += debit - credit;
    else if (acc.type === "INCOME") income += credit - debit;
    else if (acc.type === "ASSET") assetFlow += debit - credit;
  }

  if (expense > 0n) return expense;
  if (income > 0n) return income;
  const abs = assetFlow < 0n ? -assetFlow : assetFlow;
  return abs;
}

export function primaryCategoryLabel(
  txn: GroupedTransaction,
  accountById: Map<string, AccountRow>,
): string | null {
  for (const s of txn.splits) {
    const acc = accountById.get(s.accountId);
    if (acc && (acc.type === "EXPENSE" || acc.type === "INCOME")) {
      return `${acc.code} — ${acc.name}`;
    }
  }
  return null;
}

export function monthBounds(year: number, month: number): { fromDate: string; toDate: string } {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { fromDate: from, toDate: to };
}

export function defaultPeriodLast30Days(): { fromDate: string; toDate: string } {
  const toDate = new Date().toISOString().slice(0, 10);
  const from = new Date(toDate);
  from.setDate(from.getDate() - 29);
  return { fromDate: from.toISOString().slice(0, 10), toDate };
}
