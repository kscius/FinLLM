import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { parseToMinor } from "@finllm/money";
import { EmptyState } from "../components/EmptyState.js";
import { api } from "../lib/api.js";
import { formatMinorDisplay } from "../lib/format.js";
import {
  groupTransactionItems,
  headlineAmountMinor,
  primaryCategoryLabel,
  type TransactionSplitItem,
} from "../lib/transaction-rows.js";
import type { AccountRow } from "../lib/types.js";

export type ActivityInitialFilters = {
  fromDate?: string;
  toDate?: string;
  accountId?: string;
  smallExpensesOnly?: boolean;
  maxAmountMxn?: string;
};

type Props = {
  accounts: AccountRow[];
  initialFilters?: ActivityInitialFilters | null;
  onConsumedInitialFilters?: () => void;
};

function accountMap(accounts: AccountRow[]): Map<string, AccountRow> {
  return new Map(accounts.map((a) => [a.id, a]));
}

export function ActivityView({ accounts, initialFilters, onConsumedInitialFilters }: Props) {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);
  const [categoryId, setCategoryId] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "expense" | "income">("expense");
  const [smallOnly, setSmallOnly] = useState(false);
  const [maxAmountMxn, setMaxAmountMxn] = useState("200");
  const [items, setItems] = useState<TransactionSplitItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialFilters) return;
    if (initialFilters.fromDate) setFromDate(initialFilters.fromDate);
    if (initialFilters.toDate) setToDate(initialFilters.toDate);
    if (initialFilters.accountId) setCategoryId(initialFilters.accountId);
    if (initialFilters.smallExpensesOnly) setSmallOnly(true);
    if (initialFilters.maxAmountMxn) setMaxAmountMxn(initialFilters.maxAmountMxn);
    onConsumedInitialFilters?.();
  }, [initialFilters, onConsumedInitialFilters]);

  const expenseAccounts = useMemo(
    () => accounts.filter((a) => a.type === "EXPENSE" && !a.isSystem),
    [accounts],
  );
  const incomeAccounts = useMemo(
    () => accounts.filter((a) => a.type === "INCOME" && !a.isSystem),
    [accounts],
  );

  const byId = useMemo(() => accountMap(accounts), [accounts]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (categoryId) params.set("accountId", categoryId);
      const data = await api<{ items: TransactionSplitItem[] }>(`/api/v1/transactions?${params}`);
      setItems(data.items ?? []);
      setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("activity.errors.load"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, categoryId, t]);

  const grouped = useMemo(() => groupTransactionItems(items), [items]);

  const maxMinor = useMemo(() => {
    if (!smallOnly) return null;
    try {
      const minor = parseToMinor(maxAmountMxn || "0", "MXN");
      return minor < 0n ? -minor : minor;
    } catch {
      return null;
    }
  }, [smallOnly, maxAmountMxn]);

  const filtered = useMemo(() => {
    return grouped.filter((txn) => {
      const isExpense = txn.splits.some((s) => byId.get(s.accountId)?.type === "EXPENSE" && BigInt(s.debitMinor) > 0n);
      const isIncome = txn.splits.some((s) => byId.get(s.accountId)?.type === "INCOME" && BigInt(s.creditMinor) > 0n);

      if (kindFilter === "expense" && !isExpense) return false;
      if (kindFilter === "income" && !isIncome) return false;
      if (maxMinor != null && headlineAmountMinor(txn, byId) > maxMinor) return false;
      if (categoryId && !txn.splits.some((s) => s.accountId === categoryId)) return false;
      return true;
    });
  }, [grouped, byId, kindFilter, maxMinor, categoryId]);

  const selected = useMemo(
    () => filtered.find((g) => g.transactionId === selectedId) ?? null,
    [filtered, selectedId],
  );

  const totalFilteredMinor = useMemo(() => {
    let sum = 0n;
    for (const txn of filtered) {
      if (kindFilter === "income") {
        const inc = headlineAmountMinor(txn, byId);
        sum += inc;
      } else {
        sum += headlineAmountMinor(txn, byId);
      }
    }
    return sum;
  }, [filtered, byId, kindFilter]);

  function setAugustPreset() {
    const year = new Date().getFullYear();
    setFromDate(`${year}-08-01`);
    setToDate(`${year}-08-31`);
  }

  return (
    <section className="card" aria-labelledby="view-title">
      <p className="muted">{t("activity.intro")}</p>

      <div className="form-grid form-grid--2">
        <div className="field">
          <label htmlFor="activity-from">{t("activity.fromDate")}</label>
          <input id="activity-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="activity-to">{t("activity.toDate")}</label>
          <input id="activity-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <div className="toolbar" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAugustPreset()}>
          {t("activity.presetAugust")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSmallOnly((v) => !v)} aria-pressed={smallOnly}>
          {t("activity.smallExpensesToggle")}
        </button>
      </div>

      <div role="group" aria-label={t("activity.kindGroup")} className="segmented" style={{ marginTop: "0.75rem" }}>
        {(["all", "expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            className="segmented-btn"
            aria-pressed={kindFilter === k}
            onClick={() => setKindFilter(k)}
          >
            {t(`activity.kind.${k}`)}
          </button>
        ))}
      </div>

      <div className="form-grid form-grid--2" style={{ marginTop: "0.75rem" }}>
        <div className="field">
          <label htmlFor="activity-category">{t("activity.categoryFilter")}</label>
          <select id="activity-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t("activity.allCategories")}</option>
            {(kindFilter === "income" ? incomeAccounts : expenseAccounts).map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
        </div>
        {smallOnly && (
          <div className="field">
            <label htmlFor="activity-max">{t("activity.maxAmountMxn")}</label>
            <input
              id="activity-max"
              inputMode="decimal"
              value={maxAmountMxn}
              onChange={(e) => setMaxAmountMxn(e.target.value)}
            />
            <p className="field-hint">{t("activity.smallExpensesHint")}</p>
          </div>
        )}
      </div>

      <button type="button" className="btn" onClick={() => load()} disabled={loading} style={{ marginTop: "0.75rem" }}>
        {loading ? t("common.loading") : t("activity.load")}
      </button>

      {error && <p className="alert" role="alert">{error}</p>}

      {filtered.length > 0 && (
        <p className="muted" style={{ marginTop: "1rem" }}>
          {t("activity.summary", {
            count: filtered.length,
            total: formatMinorDisplay(totalFilteredMinor.toString(), "MXN"),
          })}
        </p>
      )}

      {!loading && items.length > 0 && filtered.length === 0 && (
        <EmptyState title={t("activity.emptyFilteredTitle")}>{t("activity.emptyFilteredBody")}</EmptyState>
      )}

      {!loading && items.length === 0 && !error && (
        <EmptyState illustration="ledger" title={t("activity.emptyTitle")}>{t("activity.emptyBody")}</EmptyState>
      )}

      {filtered.length > 0 && (
        <div className="activity-layout" style={{ marginTop: "1rem" }}>
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">{t("activity.tableCaption")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("common.date")}</th>
                  <th scope="col">{t("common.description")}</th>
                  <th scope="col">{t("activity.category")}</th>
                  <th scope="col" className="amount-cell">{t("common.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((txn) => {
                  const amount = headlineAmountMinor(txn, byId);
                  const isSelected = txn.transactionId === selectedId;
                  return (
                    <tr
                      key={txn.transactionId}
                      className={isSelected ? "row-selected" : undefined}
                      tabIndex={0}
                      onClick={() => setSelectedId(txn.transactionId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(txn.transactionId);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                      aria-selected={isSelected}
                    >
                      <td>{txn.txnDate}</td>
                      <td>{txn.description || t("common.noDescription")}</td>
                      <td>{primaryCategoryLabel(txn, byId) ?? "—"}</td>
                      <td className="amount-cell">{formatMinorDisplay(amount.toString(), "MXN")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected && (
            <aside className="card activity-detail" aria-labelledby="activity-detail-heading">
              <h3 id="activity-detail-heading" className="chart-heading">{t("activity.detailTitle")}</h3>
              <p className="muted">
                {selected.txnDate} · {selected.description || t("common.noDescription")}
              </p>
              <p className="muted">
                {t("activity.detailMeta", { kind: selected.kind, status: selected.status })}
              </p>
              <div className="table-wrap">
                <table className="data-table">
                  <caption className="sr-only">{t("activity.splitsCaption")}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t("common.account")}</th>
                      <th scope="col">{t("common.type")}</th>
                      <th scope="col" className="amount-cell">{t("activity.debit")}</th>
                      <th scope="col" className="amount-cell">{t("activity.credit")}</th>
                      <th scope="col">{t("activity.reconcile")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.splits.map((s) => {
                      const acc = byId.get(s.accountId);
                      return (
                        <tr key={s.splitId}>
                          <td>{acc ? `${acc.code} — ${acc.name}` : s.accountId}</td>
                          <td>{acc?.type ?? "—"}</td>
                          <td className="amount-cell">
                            {BigInt(s.debitMinor) > 0n ? formatMinorDisplay(s.debitMinor, "MXN") : "—"}
                          </td>
                          <td className="amount-cell">
                            {BigInt(s.creditMinor) > 0n ? formatMinorDisplay(s.creditMinor, "MXN") : "—"}
                          </td>
                          <td>{s.reconcileState}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {selected.splits.some((s) => s.memo) && (
                <ul className="split-list">
                  {selected.splits.filter((s) => s.memo).map((s) => (
                    <li key={s.splitId} className="muted">
                      {s.memo}
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          )}
        </div>
      )}

      {items.length >= 200 && (
        <p className="field-hint" role="status">{t("activity.limitHint")}</p>
      )}
    </section>
  );
}
