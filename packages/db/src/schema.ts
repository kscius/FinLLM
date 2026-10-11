import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
]);

export const accountSubtypeEnum = pgEnum("account_subtype", [
  "CASH",
  "BANK",
  "CREDIT_CARD",
  "LOAN",
  "OPENING_BALANCES",
  "TRADING",
  "FX_GAIN",
  "FX_LOSS",
  "INCOME_GENERIC",
  "EXPENSE_GENERIC",
]);

export const txnKindEnum = pgEnum("txn_kind", [
  "POSTING",
  "TRANSFER",
  "FX_TRANSFER",
  "OPENING",
  "REVERSAL",
]);

export const txnStatusEnum = pgEnum("txn_status", ["DRAFT", "POSTED", "VOID"]);

export const reconcileStateEnum = pgEnum("reconcile_state", [
  "UNCLEARED",
  "CLEARED",
  "RECONCILED",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const books = pgTable("books", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  bookCurrencyCode: char("book_currency_code", { length: 3 }).notNull().default("MXN"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("America/Mexico_City"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    type: accountTypeEnum("type").notNull(),
    subtype: accountSubtypeEnum("subtype").notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull(),
    isPlaceholder: boolean("is_placeholder").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    isSystem: boolean("is_system").notNull().default(false),
    includeInNetWorth: boolean("include_in_net_worth").notNull().default(true),
    includeInCashflow: boolean("include_in_cashflow").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("accounts_book_code_uidx").on(t.bookId, t.code),
    index("accounts_book_id_idx").on(t.bookId),
  ],
);

export const fxRates = pgTable(
  "fx_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    rateDate: date("rate_date").notNull(),
    baseCode: char("base_code", { length: 3 }).notNull(),
    quoteCode: char("quote_code", { length: 3 }).notNull(),
    mxnPerUsd: varchar("mxn_per_usd", { length: 24 }).notNull(),
    source: varchar("source", { length: 32 }).notNull().default("USER"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("fx_rates_book_date_uidx").on(t.bookId, t.rateDate, t.baseCode, t.quoteCode),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    txnDate: date("txn_date").notNull(),
    kind: txnKindEnum("kind").notNull(),
    status: txnStatusEnum("status").notNull().default("DRAFT"),
    description: text("description"),
    externalRef: varchar("external_ref", { length: 256 }),
    reversesTxnId: uuid("reverses_txn_id"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("transactions_book_date_idx").on(t.bookId, t.txnDate),
    uniqueIndex("transactions_book_external_uidx").on(t.bookId, t.externalRef),
  ],
);

export const splits = pgTable(
  "splits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    debitMinor: bigint("debit_minor", { mode: "bigint" }).notNull().default(sql`0`),
    creditMinor: bigint("credit_minor", { mode: "bigint" }).notNull().default(sql`0`),
    commodityCode: char("commodity_code", { length: 3 }).notNull(),
    bookDebitMinor: bigint("book_debit_minor", { mode: "bigint" }).notNull().default(sql`0`),
    bookCreditMinor: bigint("book_credit_minor", { mode: "bigint" }).notNull().default(sql`0`),
    fxRateId: uuid("fx_rate_id").references(() => fxRates.id),
    memo: text("memo"),
    reconcileState: reconcileStateEnum("reconcile_state").notNull().default("UNCLEARED"),
    sortIndex: bigint("sort_index", { mode: "number" }).notNull().default(0),
  },
  (t) => [
    index("splits_txn_id_idx").on(t.transactionId),
    index("splits_account_id_idx").on(t.accountId),
  ],
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("budgets_book_id_idx").on(t.bookId)],
);

export const budgetLines = pgTable(
  "budget_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    commodityCode: char("commodity_code", { length: 3 }).notNull(),
  },
  (t) => [index("budget_lines_budget_id_idx").on(t.budgetId)],
);

export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull().default("PENDING"),
    format: varchar("format", { length: 16 }).notNull(),
    fileName: varchar("file_name", { length: 256 }),
    previewJson: jsonb("preview_json"),
    errorMessage: text("error_message"),
    idempotencyKey: varchar("idempotency_key", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    committedAt: timestamp("committed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("import_jobs_idempotency_uidx").on(t.bookId, t.idempotencyKey),
    index("import_jobs_book_id_idx").on(t.bookId),
  ],
);

export const mcpTokens = pgTable(
  "mcp_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    scopes: text("scopes").array().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mcp_tokens_user_id_idx").on(t.userId)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actor: varchar("actor", { length: 128 }).notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id"),
    bookId: uuid("book_id").references(() => books.id),
    idempotencyKey: varchar("idempotency_key", { length: 128 }),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    payloadSha256: char("payload_sha256", { length: 64 }),
    requestId: uuid("request_id"),
  },
  (t) => [
    index("audit_events_book_at_idx").on(t.bookId, t.at),
    uniqueIndex("audit_events_idempotency_uidx").on(t.idempotencyKey),
  ],
);

export const confirmTokens = pgTable(
  "confirm_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    operation: varchar("operation", { length: 64 }).notNull(),
    payloadHash: char("payload_hash", { length: 64 }).notNull(),
    previewJson: jsonb("preview_json").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("confirm_tokens_user_expires_idx").on(t.userId, t.expiresAt)],
);
