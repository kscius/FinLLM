import { relations } from "drizzle-orm";
import {
  users,
  sessions,
  books,
  accounts,
  transactions,
  splits,
  budgets,
  budgetLines,
  importJobs,
  auditEvents,
  mcpTokens,
  confirmTokens,
  fxRates,
} from "./schema.js";

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  books: many(books),
  mcpTokens: many(mcpTokens),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  user: one(users, { fields: [books.userId], references: [users.id] }),
  accounts: many(accounts),
  transactions: many(transactions),
  budgets: many(budgets),
  importJobs: many(importJobs),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  book: one(books, { fields: [accounts.bookId], references: [books.id] }),
  splits: many(splits),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  book: one(books, { fields: [transactions.bookId], references: [books.id] }),
  splits: many(splits),
}));

export const splitsRelations = relations(splits, ({ one }) => ({
  transaction: one(transactions, { fields: [splits.transactionId], references: [transactions.id] }),
  account: one(accounts, { fields: [splits.accountId], references: [accounts.id] }),
}));

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  book: one(books, { fields: [budgets.bookId], references: [books.id] }),
  lines: many(budgetLines),
}));

export const budgetLinesRelations = relations(budgetLines, ({ one }) => ({
  budget: one(budgets, { fields: [budgetLines.budgetId], references: [budgets.id] }),
  account: one(accounts, { fields: [budgetLines.accountId], references: [accounts.id] }),
}));

export const importJobsRelations = relations(importJobs, ({ one }) => ({
  book: one(books, { fields: [importJobs.bookId], references: [books.id] }),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  book: one(books, { fields: [auditEvents.bookId], references: [books.id] }),
}));

export const mcpTokensRelations = relations(mcpTokens, ({ one }) => ({
  user: one(users, { fields: [mcpTokens.userId], references: [users.id] }),
}));

export const confirmTokensRelations = relations(confirmTokens, ({ one }) => ({
  user: one(users, { fields: [confirmTokens.userId], references: [users.id] }),
  book: one(books, { fields: [confirmTokens.bookId], references: [books.id] }),
}));

export const fxRatesRelations = relations(fxRates, ({ one }) => ({
  book: one(books, { fields: [fxRates.bookId], references: [books.id] }),
}));
