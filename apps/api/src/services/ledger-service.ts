import type { Db } from "@finllm/db";
import { accounts, auditEvents, splits, transactions } from "@finllm/db";
import {
  nativeSignedBalance,
  toBookMinor,
  validateAndClassifyPosting,
  type AccountType,
  type SplitInput,
} from "@finllm/domain";
import { eq, and, sql } from "drizzle-orm";
import { sha256Payload } from "../crypto.js";

export interface CreateTransactionInput {
  bookId: string;
  txnDate: string;
  description?: string;
  externalRef?: string;
  splits: Array<{
    accountId: string;
    debitMinor: bigint;
    creditMinor: bigint;
  }>;
  actor: string;
  idempotencyKey?: string;
  mxnPerUsd?: string;
  bookCurrency: "MXN" | "USD";
}

export async function createAndPostTransaction(db: Db, input: CreateTransactionInput) {
  if (input.idempotencyKey) {
    const existing = await db.query.auditEvents.findFirst({
      where: eq(auditEvents.idempotencyKey, input.idempotencyKey),
    });
    if (existing?.entityId) {
      const txn = await db.query.transactions.findFirst({
        where: eq(transactions.id, existing.entityId),
      });
      if (txn) return { transactionId: txn.id, duplicate: true };
    }
  }

  const accountRows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.bookId, input.bookId));

  const accountMap = new Map(accountRows.map((a) => [a.id, a]));

  const splitInputs: SplitInput[] = input.splits.map((s) => {
    const acc = accountMap.get(s.accountId);
    if (!acc) throw new Error(`Unknown account ${s.accountId}`);
    if (acc.isPlaceholder) throw new Error(`Account ${acc.code} is a placeholder`);
    return {
      accountId: s.accountId,
      accountType: acc.type as AccountType,
      currencyCode: acc.currencyCode as "MXN" | "USD",
      debitMinor: s.debitMinor,
      creditMinor: s.creditMinor,
    };
  });

  const classified = validateAndClassifyPosting(
    splitInputs,
    input.bookCurrency,
    input.mxnPerUsd,
  );

  const [txn] = await db
    .insert(transactions)
    .values({
      bookId: input.bookId,
      txnDate: input.txnDate,
      kind: classified.kind,
      status: "POSTED",
      description: input.description,
      externalRef: input.externalRef,
      postedAt: new Date(),
    })
    .returning();

  if (!txn) throw new Error("Failed to create transaction");

  let sort = 0;
  for (const s of input.splits) {
    const acc = accountMap.get(s.accountId)!;
    const book = toBookMinor(
      s.debitMinor,
      s.creditMinor,
      acc.currencyCode as "MXN" | "USD",
      input.bookCurrency,
      input.mxnPerUsd,
    );
    await db.insert(splits).values({
      transactionId: txn.id,
      accountId: s.accountId,
      debitMinor: s.debitMinor,
      creditMinor: s.creditMinor,
      commodityCode: acc.currencyCode,
      bookDebitMinor: book.bookDebit,
      bookCreditMinor: book.bookCredit,
      sortIndex: sort++,
    });
  }

  const after = { transactionId: txn.id, kind: classified.kind, splits: input.splits };
  await db.insert(auditEvents).values({
    actor: input.actor,
    action: "POST",
    entityType: "transaction",
    entityId: txn.id,
    bookId: input.bookId,
    idempotencyKey: input.idempotencyKey,
    afterJson: after,
    payloadSha256: sha256Payload(after),
  });

  return { transactionId: txn.id, duplicate: false };
}

export async function getAccountBalances(db: Db, bookId: string) {
  const rows = await db
    .select({
      accountId: splits.accountId,
      type: accounts.type,
      currencyCode: accounts.currencyCode,
      name: accounts.name,
      code: accounts.code,
      includeInNetWorth: accounts.includeInNetWorth,
      debitSum: sql<bigint>`coalesce(sum(${splits.debitMinor}), 0)`,
      creditSum: sql<bigint>`coalesce(sum(${splits.creditMinor}), 0)`,
    })
    .from(splits)
    .innerJoin(transactions, eq(splits.transactionId, transactions.id))
    .innerJoin(accounts, eq(splits.accountId, accounts.id))
    .where(and(eq(transactions.bookId, bookId), eq(transactions.status, "POSTED")))
    .groupBy(
      splits.accountId,
      accounts.type,
      accounts.currencyCode,
      accounts.name,
      accounts.code,
      accounts.includeInNetWorth,
    );

  return rows.map((r) => ({
    accountId: r.accountId,
    code: r.code,
    name: r.name,
    type: r.type,
    currencyCode: r.currencyCode,
    balanceMinor: nativeSignedBalance(
      r.type as AccountType,
      BigInt(r.debitSum),
      BigInt(r.creditSum),
    ).toString(),
    includeInNetWorth: r.includeInNetWorth,
  }));
}

export async function computeNetWorthMxn(db: Db, bookId: string): Promise<bigint> {
  const balances = await getAccountBalances(db, bookId);
  let nw = 0n;
  for (const b of balances) {
    if (!b.includeInNetWorth) continue;
    const bal = BigInt(b.balanceMinor);
    if (b.type === "ASSET") nw += bal;
    if (b.type === "LIABILITY") nw -= bal;
  }
  return nw;
}
