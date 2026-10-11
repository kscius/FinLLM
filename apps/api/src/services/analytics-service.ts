import type { Db } from "@finllm/db";
import { accounts, splits, transactions } from "@finllm/db";
import type { AccountType } from "@finllm/domain";
import { and, eq, gte, lte, sql } from "drizzle-orm";

export function netWorthDeltaFromSplit(
  type: AccountType,
  includeInNetWorth: boolean,
  bookDebit: bigint,
  bookCredit: bigint,
): bigint {
  if (!includeInNetWorth) return 0n;
  if (type === "ASSET" || type === "LIABILITY") return bookDebit - bookCredit;
  return 0n;
}

export type NetWorthPoint = { date: string; netWorthMinor: string };

/** Cumulative net worth (book currency) by transaction date. */
export async function getNetWorthSeries(
  db: Db,
  bookId: string,
  fromDate: string,
  toDate: string,
): Promise<NetWorthPoint[]> {
  const rows = await db
    .select({
      txnDate: transactions.txnDate,
      type: accounts.type,
      includeInNetWorth: accounts.includeInNetWorth,
      bookDebit: splits.bookDebitMinor,
      bookCredit: splits.bookCreditMinor,
    })
    .from(splits)
    .innerJoin(transactions, eq(splits.transactionId, transactions.id))
    .innerJoin(accounts, eq(splits.accountId, accounts.id))
    .where(
      and(
        eq(transactions.bookId, bookId),
        eq(transactions.status, "POSTED"),
        lte(transactions.txnDate, toDate),
      ),
    )
    .orderBy(transactions.txnDate);

  const byDate = new Map<string, bigint>();
  for (const r of rows) {
    const delta = netWorthDeltaFromSplit(
      r.type as AccountType,
      r.includeInNetWorth,
      BigInt(r.bookDebit),
      BigInt(r.bookCredit),
    );
    if (delta === 0n) continue;
    const prev = byDate.get(r.txnDate) ?? 0n;
    byDate.set(r.txnDate, prev + delta);
  }

  const sortedDates = [...byDate.keys()].sort();
  let running = 0n;
  const points: NetWorthPoint[] = [];
  for (const d of sortedDates) {
    running += byDate.get(d)!;
    if (d >= fromDate) {
      points.push({ date: d, netWorthMinor: running.toString() });
    }
  }
  if (points.length === 0 && running !== 0n) {
    points.push({ date: fromDate, netWorthMinor: running.toString() });
  }
  return points;
}

export type ExpenseCategoryRow = {
  accountId: string;
  code: string;
  name: string;
  totalMinor: string;
};

/** Posted expense debits (book currency) by expense account in range. */
export async function getExpensesByCategory(
  db: Db,
  bookId: string,
  fromDate: string,
  toDate: string,
): Promise<ExpenseCategoryRow[]> {
  const rows = await db
    .select({
      accountId: splits.accountId,
      code: accounts.code,
      name: accounts.name,
      debitSum: sql<bigint>`coalesce(sum(${splits.bookDebitMinor}), 0)`,
      creditSum: sql<bigint>`coalesce(sum(${splits.bookCreditMinor}), 0)`,
    })
    .from(splits)
    .innerJoin(transactions, eq(splits.transactionId, transactions.id))
    .innerJoin(accounts, eq(splits.accountId, accounts.id))
    .where(
      and(
        eq(transactions.bookId, bookId),
        eq(transactions.status, "POSTED"),
        eq(accounts.type, "EXPENSE"),
        gte(transactions.txnDate, fromDate),
        lte(transactions.txnDate, toDate),
      ),
    )
    .groupBy(splits.accountId, accounts.code, accounts.name);

  return rows
    .map((r) => {
      const total = BigInt(r.debitSum) - BigInt(r.creditSum);
      return {
        accountId: r.accountId,
        code: r.code,
        name: r.name,
        totalMinor: total.toString(),
      };
    })
    .filter((r) => r.totalMinor !== "0")
    .sort((a, b) => (BigInt(b.totalMinor) > BigInt(a.totalMinor) ? 1 : -1));
}
