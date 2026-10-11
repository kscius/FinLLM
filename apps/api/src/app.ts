import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import {
  createDb,
  books,
  users,
  sessions,
  accounts,
  importJobs,
  budgets,
  budgetLines,
  mcpTokens,
  confirmTokens,
  splits,
  transactions,
  auditEvents,
} from "@finllm/db";
import { parseToMinor, formatDisplay } from "@finllm/money";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import { generateToken, hashToken, sha256Payload } from "./crypto.js";
import { seedSystemAccounts } from "./seed-accounts.js";
import { createAndPostTransaction, computeNetWorthMxn, getAccountBalances } from "./services/ledger-service.js";
import { parseCsvContent } from "./services/import-csv.js";

export async function buildApp(config: AppConfig) {
  const db = createDb(config.DATABASE_URL);
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: config.CORS_ORIGIN, credentials: true });
  await app.register(cookie, { secret: config.SESSION_SECRET });

  app.decorate("db", db);
  app.decorate("config", config);

  async function resolveBearer(
    request: { headers: { authorization?: string } },
    requiredScope: "ledger.read" | "ledger.write" = "ledger.read",
  ) {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    const tokenHash = hashToken(header.slice(7));
    const row = await db.query.mcpTokens.findFirst({
      where: eq(mcpTokens.tokenHash, tokenHash),
    });
    if (!row || row.revokedAt || (row.expiresAt && row.expiresAt < new Date())) return null;
    if (!row.scopes.includes(requiredScope) && !row.scopes.includes("ledger.write")) return null;
    if (requiredScope === "ledger.write" && !row.scopes.includes("ledger.write")) return null;
    const user = await db.query.users.findFirst({ where: eq(users.id, row.userId) });
    if (!user) return null;
    const book = await db.query.books.findFirst({ where: eq(books.userId, user.id) });
    return { user, book, scopes: row.scopes };
  }

  async function resolveSession(request: {
    cookies: { finllm_session?: string };
    headers: { authorization?: string };
  }) {
    const bearer = await resolveBearer(request, "ledger.read");
    if (bearer) return bearer;
    const raw = request.cookies.finllm_session;
    if (!raw) return null;
    const tokenHash = hashToken(raw);
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.tokenHash, tokenHash),
    });
    if (!session || session.expiresAt < new Date()) return null;
    const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
    if (!user) return null;
    const book = await db.query.books.findFirst({ where: eq(books.userId, user.id) });
    return { user, book };
  }

  async function requireAuth(
    request: { cookies: { finllm_session?: string }; headers: { authorization?: string } },
    reply: { code: (n: number) => { send: (b: unknown) => void } },
  ) {
    const ctx = await resolveSession(request);
    if (!ctx) {
      reply.code(401).send({ error: "Unauthorized" });
      return null;
    }
    return ctx;
  }

  app.get("/health", async () => ({ status: "ok", service: "finllm-api" }));
  app.get("/ready", async () => {
    await db.execute(sql`select 1`);
    return { status: "ready" };
  });

  app.post("/api/v1/auth/register", async (request, reply) => {
    if (!config.ALLOW_REGISTRATION) {
      return reply.code(403).send({ error: "Registration disabled" });
    }
    const body = z
      .object({ email: z.string().email(), password: z.string().min(12), displayName: z.string().optional() })
      .parse(request.body);

    const passwordHash = await bcrypt.hash(body.password, 12);
    const [user] = await db
      .insert(users)
      .values({ email: body.email, passwordHash, displayName: body.displayName })
      .returning();

    if (!user) return reply.code(500).send({ error: "Failed to create user" });

    const [book] = await db
      .insert(books)
      .values({
        userId: user.id,
        name: "Personal",
        bookCurrencyCode: config.FINLLM_BOOK_CURRENCY,
        timezone: config.FINLLM_TIMEZONE,
      })
      .returning();

    if (book) await seedSystemAccounts(db, book.id);

    const token = generateToken();
    await db.insert(sessions).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    reply.setCookie("finllm_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
    return { userId: user.id, bookId: book?.id };
  });

  app.post("/api/v1/auth/login", async (request, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(request.body);
    const user = await db.query.users.findFirst({ where: eq(users.email, body.email) });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }
    const token = generateToken();
    await db.insert(sessions).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    reply.setCookie("finllm_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
    const book = await db.query.books.findFirst({ where: eq(books.userId, user.id) });
    return { userId: user.id, bookId: book?.id };
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    const raw = request.cookies.finllm_session;
    if (raw) {
      await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(raw)));
    }
    reply.clearCookie("finllm_session", { path: "/" });
    return { ok: true };
  });

  app.get("/api/v1/me", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx) return;
    return {
      user: { id: ctx.user.id, email: ctx.user.email, displayName: ctx.user.displayName },
      book: ctx.book,
    };
  });

  app.post("/api/v1/setup/initialize", async (request, reply) => {
    const existing = await db.query.users.findFirst();
    if (existing) return reply.code(409).send({ error: "Instance already initialized" });
    const body = z
      .object({ email: z.string().email(), password: z.string().min(12), displayName: z.string().optional() })
      .parse(request.body);
    const passwordHash = await bcrypt.hash(body.password, 12);
    const [user] = await db.insert(users).values({ email: body.email, passwordHash, displayName: body.displayName }).returning();
    if (!user) return reply.code(500).send({ error: "Failed" });
    const [book] = await db
      .insert(books)
      .values({
        userId: user.id,
        name: "Personal",
        bookCurrencyCode: config.FINLLM_BOOK_CURRENCY,
        timezone: config.FINLLM_TIMEZONE,
      })
      .returning();
    if (book) await seedSystemAccounts(db, book.id);
    const token = generateToken();
    await db.insert(sessions).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    reply.setCookie("finllm_session", token, { httpOnly: true, sameSite: "lax", path: "/" });
    return { userId: user.id, bookId: book?.id };
  });

  app.get("/api/v1/accounts", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx?.book) return;
    const rows = await db.select().from(accounts).where(eq(accounts.bookId, ctx.book.id));
    return { accounts: rows };
  });

  app.post("/api/v1/accounts", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx?.book) return;
    const body = z
      .object({
        code: z.string().min(1).max(32),
        name: z.string().min(1).max(120),
        type: z.enum(["ASSET", "LIABILITY", "INCOME", "EXPENSE"]),
        subtype: z.enum(["CASH", "BANK", "CREDIT_CARD", "LOAN", "INCOME_GENERIC", "EXPENSE_GENERIC"]),
        currencyCode: z.enum(["MXN", "USD"]),
      })
      .parse(request.body);
    const [row] = await db
      .insert(accounts)
      .values({ bookId: ctx.book.id, ...body, isSystem: false })
      .returning();
    return { account: row };
  });

  app.get("/api/v1/balances", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx?.book) return;
    const balances = await getAccountBalances(db, ctx.book.id);
    const netWorthMinor = await computeNetWorthMxn(db, ctx.book.id);
    return {
      balances,
      netWorth: formatDisplay(netWorthMinor, "MXN"),
      netWorthMinor: netWorthMinor.toString(),
    };
  });

  app.post("/api/v1/transactions", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx?.book) return;
    const body = z
      .object({
        txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description: z.string().optional(),
        externalRef: z.string().optional(),
        idempotencyKey: z.string().optional(),
        mxnPerUsd: z.string().optional(),
        splits: z
          .array(
            z.object({
              accountId: z.string().uuid(),
              debitMinor: z.string(),
              creditMinor: z.string(),
            }),
          )
          .min(2),
      })
      .parse(request.body);

    const result = await createAndPostTransaction(db, {
      bookId: ctx.book.id,
      txnDate: body.txnDate,
      description: body.description,
      externalRef: body.externalRef,
      idempotencyKey: body.idempotencyKey,
      mxnPerUsd: body.mxnPerUsd,
      bookCurrency: ctx.book.bookCurrencyCode as "MXN",
      actor: `user:${ctx.user.id}`,
      splits: body.splits.map((s) => ({
        accountId: s.accountId,
        debitMinor: BigInt(s.debitMinor),
        creditMinor: BigInt(s.creditMinor),
      })),
    });
    return result;
  });

  app.post("/api/v1/imports/csv/preview", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx?.book) return;
    const body = z.object({ content: z.string().max(2_000_000), fileName: z.string().optional() }).parse(request.body);
    const rows = parseCsvContent(body.content);
    const [job] = await db
      .insert(importJobs)
      .values({
        bookId: ctx.book.id,
        status: "PREVIEW",
        format: "CSV",
        fileName: body.fileName,
        previewJson: rows,
      })
      .returning();
    return { importJobId: job?.id, rowCount: rows.length, rows };
  });

  app.post("/api/v1/imports/:id/commit", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx?.book) return;
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        defaultExpenseAccountId: z.string().uuid(),
        defaultIncomeAccountId: z.string().uuid(),
        defaultAssetAccountId: z.string().uuid(),
        confirmId: z.string().uuid().optional(),
      })
      .parse(request.body);

    const job = await db.query.importJobs.findFirst({
      where: and(eq(importJobs.id, params.id), eq(importJobs.bookId, ctx.book.id)),
    });
    if (!job || job.status !== "PREVIEW") {
      return reply.code(400).send({ error: "Import job not in preview state" });
    }

    const rows = (job.previewJson as Array<{ date: string; amount: string; description: string; externalRef: string }>) ?? [];
    let created = 0;
    for (const row of rows) {
      const minor = parseToMinor(row.amount, "MXN");
      const isExpense = minor < 0n;
      const abs = minor < 0n ? -minor : minor;
      const splitsPayload = isExpense
        ? [
            { accountId: body.defaultAssetAccountId, debitMinor: 0n, creditMinor: abs },
            { accountId: body.defaultExpenseAccountId, debitMinor: abs, creditMinor: 0n },
          ]
        : [
            { accountId: body.defaultAssetAccountId, debitMinor: abs, creditMinor: 0n },
            { accountId: body.defaultIncomeAccountId, debitMinor: 0n, creditMinor: abs },
          ];

      await createAndPostTransaction(db, {
        bookId: ctx.book.id,
        txnDate: row.date,
        description: row.description,
        externalRef: row.externalRef,
        idempotencyKey: `import:${job.id}:${row.externalRef}`,
        bookCurrency: "MXN",
        actor: `import:${job.id}`,
        splits: splitsPayload,
      });
      created++;
    }

    await db
      .update(importJobs)
      .set({ status: "COMMITTED", committedAt: new Date() })
      .where(eq(importJobs.id, job.id));

    return { committed: created };
  });

  app.get("/api/v1/budgets", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx?.book) return;
    const list = await db.select().from(budgets).where(eq(budgets.bookId, ctx.book.id));
    return { budgets: list };
  });

  app.post("/api/v1/budgets", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx?.book) return;
    const body = z
      .object({
        name: z.string(),
        periodStart: z.string(),
        periodEnd: z.string(),
        lines: z.array(
          z.object({ accountId: z.string().uuid(), amountMinor: z.string(), commodityCode: z.enum(["MXN", "USD"]) }),
        ),
      })
      .parse(request.body);
    const [budget] = await db
      .insert(budgets)
      .values({ bookId: ctx.book.id, name: body.name, periodStart: body.periodStart, periodEnd: body.periodEnd })
      .returning();
    if (!budget) return reply.code(500).send({ error: "Failed" });
    for (const line of body.lines) {
      await db.insert(budgetLines).values({
        budgetId: budget.id,
        accountId: line.accountId,
        amountMinor: BigInt(line.amountMinor),
        commodityCode: line.commodityCode,
      });
    }
    return { budget };
  });

  app.post("/api/v1/mcp/tokens", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx) return;
    const body = z
      .object({
        name: z.string(),
        scopes: z.array(z.enum(["ledger.read", "ledger.write"])),
      })
      .parse(request.body);
    const token = generateToken();
    await db.insert(mcpTokens).values({
      userId: ctx.user.id,
      name: body.name,
      tokenHash: hashToken(token),
      scopes: body.scopes,
    });
    return { token, scopes: body.scopes, note: "Store this token securely; it will not be shown again." };
  });

  app.post("/api/v1/confirm/preview", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx?.book) return;
    const body = z.object({ operation: z.string(), preview: z.record(z.unknown()) }).parse(request.body);
    const payloadHash = sha256Payload(body.preview);
    const [row] = await db
      .insert(confirmTokens)
      .values({
        userId: ctx.user.id,
        bookId: ctx.book.id,
        operation: body.operation,
        payloadHash,
        previewJson: body.preview,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      })
      .returning();
    return { confirmId: row?.id, expiresAt: row?.expiresAt };
  });

  app.post("/api/v1/confirm/commit", async (request, reply) => {
    const header = request.headers.authorization;
    const ctx = await requireAuth(request, reply);
    if (!ctx?.book) return;
    if (header?.startsWith("Bearer ")) {
      const writeCtx = await resolveBearer(request, "ledger.write");
      if (!writeCtx) {
        return reply.code(403).send({ error: "ledger.write scope required for MCP commit" });
      }
    }
    const body = z.object({ confirmId: z.string().uuid() }).parse(request.body);
    const token = await db.query.confirmTokens.findFirst({
      where: and(eq(confirmTokens.id, body.confirmId), eq(confirmTokens.userId, ctx.user.id)),
    });
    if (!token || token.bookId !== ctx.book.id) {
      return reply.code(404).send({ error: "Confirm token not found" });
    }
    if (token.consumedAt) return reply.code(409).send({ error: "Confirm token already used" });
    if (token.expiresAt < new Date()) return reply.code(410).send({ error: "Confirm token expired" });

    let result: unknown;
    if (token.operation === "post_transaction") {
      const preview = token.previewJson as {
        txnDate: string;
        description?: string;
        externalRef?: string;
        idempotencyKey?: string;
        splits: Array<{ accountId: string; debitMinor: string; creditMinor: string }>;
      };
      result = await createAndPostTransaction(db, {
        bookId: ctx.book.id,
        txnDate: preview.txnDate,
        description: preview.description,
        externalRef: preview.externalRef,
        idempotencyKey: preview.idempotencyKey ?? `confirm:${token.id}`,
        bookCurrency: ctx.book.bookCurrencyCode as "MXN",
        actor: header?.startsWith("Bearer ") ? `mcp:${ctx.user.id}` : `user:${ctx.user.id}`,
        splits: preview.splits.map((s) => ({
          accountId: s.accountId,
          debitMinor: BigInt(s.debitMinor),
          creditMinor: BigInt(s.creditMinor),
        })),
      });
    } else {
      return reply.code(400).send({ error: `Unsupported operation: ${token.operation}` });
    }

    await db
      .update(confirmTokens)
      .set({ consumedAt: new Date() })
      .where(eq(confirmTokens.id, token.id));

    await db.insert(auditEvents).values({
      actor: header?.startsWith("Bearer ") ? `mcp:${ctx.user.id}` : `user:${ctx.user.id}`,
      action: "POST",
      entityType: "confirm_commit",
      entityId: token.id,
      bookId: ctx.book.id,
      afterJson: { operation: token.operation, result },
      payloadSha256: token.payloadHash,
    });

    return { ok: true, result };
  });

  app.get("/api/v1/transactions", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx?.book) return;
    const query = z
      .object({
        accountId: z.string().uuid().optional(),
        reconcileState: z.enum(["UNCLEARED", "CLEARED", "RECONCILED"]).optional(),
        limit: z.coerce.number().int().min(1).max(200).optional(),
      })
      .parse(request.query);

    const limit = query.limit ?? 50;
    const rows = await db
      .select({
        transactionId: transactions.id,
        txnDate: transactions.txnDate,
        description: transactions.description,
        kind: transactions.kind,
        status: transactions.status,
        splitId: splits.id,
        accountId: splits.accountId,
        debitMinor: splits.debitMinor,
        creditMinor: splits.creditMinor,
        reconcileState: splits.reconcileState,
        memo: splits.memo,
      })
      .from(splits)
      .innerJoin(transactions, eq(splits.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.bookId, ctx.book.id),
          eq(transactions.status, "POSTED"),
          query.accountId ? eq(splits.accountId, query.accountId) : sql`true`,
          query.reconcileState ? eq(splits.reconcileState, query.reconcileState) : sql`true`,
        ),
      )
      .limit(limit);

    return { items: rows.map((r) => ({
      ...r,
      debitMinor: r.debitMinor.toString(),
      creditMinor: r.creditMinor.toString(),
    })) };
  });

  app.patch("/api/v1/splits/:splitId/reconcile", async (request, reply) => {
    const ctx = await requireAuth(request, reply);
    if (!ctx?.book) return;
    const params = z.object({ splitId: z.string().uuid() }).parse(request.params);
    const body = z.object({ state: z.enum(["CLEARED", "RECONCILED", "UNCLEARED"]) }).parse(request.body);

    const row = await db
      .select({ split: splits, txn: transactions })
      .from(splits)
      .innerJoin(transactions, eq(splits.transactionId, transactions.id))
      .where(and(eq(splits.id, params.splitId), eq(transactions.bookId, ctx.book.id)))
      .limit(1);

    const hit = row[0];
    if (!hit) return reply.code(404).send({ error: "Split not found" });

    await db.update(splits).set({ reconcileState: body.state }).where(eq(splits.id, params.splitId));

    await db.insert(auditEvents).values({
      actor: `user:${ctx.user.id}`,
      action: "RECONCILE",
      entityType: "split",
      entityId: params.splitId,
      bookId: ctx.book.id,
      beforeJson: { reconcileState: hit.split.reconcileState },
      afterJson: { reconcileState: body.state },
    });

    return { splitId: params.splitId, reconcileState: body.state };
  });

  return app;
}
