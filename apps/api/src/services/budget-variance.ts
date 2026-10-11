import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { Db } from "@finllm/db";
import { budgets, budgetLines, accounts, splits, transactions } from "@finllm/db";

export async function getBudgetWithVariance(db: Db, bookId: string, budgetId: string) {
  const budget = await db.query.budgets.findFirst({
    where: and(eq(budgets.id, budgetId), eq(budgets.bookId, bookId)),
  });
  if (!budget) return null;

  const lines = await db
    .select({
      lineId: budgetLines.id,
      accountId: budgetLines.accountId,
      amountMinor: budgetLines.amountMinor,
      commodityCode: budgetLines.commodityCode,
      accountCode: accounts.code,
      accountName: accounts.name,
      accountType: accounts.type,
    })
    .from(budgetLines)
    .innerJoin(accounts, eq(budgetLines.accountId, accounts.id))
    .where(eq(budgetLines.budgetId, budgetId));

  const varianceLines = [];
  for (const line of lines) {
    const [agg] = await db
      .select({
        debitSum: sql<bigint>`coalesce(sum(${splits.debitMinor}), 0)`,
        creditSum: sql<bigint>`coalesce(sum(${splits.creditMinor}), 0)`,
      })
      .from(splits)
      .innerJoin(transactions, eq(splits.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.bookId, bookId),
          eq(transactions.status, "POSTED"),
          eq(splits.accountId, line.accountId),
          gte(transactions.txnDate, budget.periodStart),
          lte(transactions.txnDate, budget.periodEnd),
        ),
      );

    const debit = BigInt(agg?.debitSum ?? 0n);
    const credit = BigInt(agg?.creditSum ?? 0n);
    let actualMinor = 0n;
    if (line.accountType === "EXPENSE") actualMinor = debit - credit;
    else if (line.accountType === "INCOME") actualMinor = credit - debit;
    else actualMinor = debit - credit;

    const budgeted = line.amountMinor;
    varianceLines.push({
      lineId: line.lineId,
      accountId: line.accountId,
      accountCode: line.accountCode,
      accountName: line.accountName,
      accountType: line.accountType,
      commodityCode: line.commodityCode,
      budgetedMinor: budgeted.toString(),
      actualMinor: actualMinor.toString(),
      varianceMinor: (budgeted - actualMinor).toString(),
    });
  }

  return {
    budget,
    lines: varianceLines,
  };
}
