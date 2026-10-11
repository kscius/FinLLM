import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../components/EmptyState.js";
import { parseToMinor } from "@finllm/money";
import { api } from "../lib/api.js";
import { formatMinorDisplay } from "../lib/format.js";
import type { AccountRow } from "../lib/types.js";

type Budget = { id: string; name: string; periodStart: string; periodEnd: string };

type VarianceLine = {
  accountCode: string;
  accountName: string;
  budgetedMinor: string;
  actualMinor: string;
  varianceMinor: string;
};

type Props = {
  accounts: AccountRow[];
};

export function BudgetsView({ accounts }: Props) {
  const { t } = useTranslation();
  const [list, setList] = useState<Budget[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [variance, setVariance] = useState<VarianceLine[]>([]);
  const [varianceLoading, setVarianceLoading] = useState(false);
  const [name, setName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [lineAccountId, setLineAccountId] = useState("");
  const [lineAmount, setLineAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE" && !a.isSystem);

  const load = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const data = await api<{ budgets: Budget[] }>("/api/v1/budgets");
      setList(data.budgets);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("budgets.errors.loadList"));
    } finally {
      setListLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function loadVariance(b: Budget) {
    setSelected(b.id);
    setSelectedName(b.name);
    setVarianceLoading(true);
    setStatus(t("budgets.loadingVarianceFor", { name: b.name }));
    setError(null);
    try {
      const data = await api<{ lines: VarianceLine[] }>(`/api/v1/budgets/${b.id}/variance`);
      setVariance(data.lines);
      setStatus(
        data.lines.length === 0
          ? t("budgets.varianceEmpty", { name: b.name })
          : t("budgets.varianceLoaded", { name: b.name, count: data.lines.length }),
      );
    } catch (err) {
      setVariance([]);
      setError(err instanceof Error ? err.message : t("budgets.errors.loadVariance"));
    } finally {
      setVarianceLoading(false);
    }
  }

  async function createBudget(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("");
    const acc = lineAccountId || expenseAccounts[0]?.id;
    if (!acc || !lineAmount) {
      setError(t("budgets.needLine"));
      return;
    }
    setBusy(true);
    try {
      const amountMinor = parseToMinor(lineAmount, "MXN").toString();
      await api("/api/v1/budgets", {
        method: "POST",
        body: JSON.stringify({
          name,
          periodStart,
          periodEnd,
          lines: [{ accountId: acc, amountMinor, commodityCode: "MXN" }],
        }),
      });
      setName("");
      setLineAmount("");
      setStatus(t("budgets.createdSuccess"));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("budgets.errors.create"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="view-title">
      <p className="muted">{t("budgets.intro")}</p>
      <p className="sr-only" aria-live="polite">{status}</p>
      <form onSubmit={createBudget} aria-busy={busy}>
        <div className="field">
          <label htmlFor="bud-name">{t("budgets.name")}</label>
          <input id="bud-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-grid form-grid--2">
          <div className="field">
            <label htmlFor="bud-start">{t("budgets.periodStart")}</label>
            <input id="bud-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="bud-end">{t("budgets.periodEnd")}</label>
            <input id="bud-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="bud-acc">{t("budgets.expenseAccount")}</label>
          <select
            id="bud-acc"
            value={lineAccountId || expenseAccounts[0]?.id || ""}
            onChange={(e) => setLineAccountId(e.target.value)}
            disabled={expenseAccounts.length === 0}
          >
            {expenseAccounts.length === 0 ? (
              <option value="">{t("budgets.noExpenseAccounts")}</option>
            ) : (
              expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))
            )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bud-amt">{t("budgets.budgetedAmount")}</label>
          <input id="bud-amt" value={lineAmount} onChange={(e) => setLineAmount(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-sm" disabled={busy || expenseAccounts.length === 0}>
          {busy ? t("common.creating") : t("budgets.createBudget")}
        </button>
      </form>
      {error && <p className="alert" role="alert">{error}</p>}

      {listLoading && <p className="muted" role="status">{t("budgets.loadingList")}</p>}
      {!listLoading && list.length === 0 && (
        <EmptyState illustration="chart" title={t("budgets.emptyTitle")}>
          {t("budgets.emptyBody")}
        </EmptyState>
      )}

      {list.length > 0 && (
        <ul className="split-list" style={{ marginTop: "1.25rem" }}>
          {list.map((b) => (
            <li key={b.id} className="split-row">
              <span>{b.name} ({b.periodStart} — {b.periodEnd})</span>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={varianceLoading}
                aria-label={t("budgets.viewVarianceAria", { name: b.name })}
                onClick={() => loadVariance(b)}
              >
                {t("budgets.viewVariance")}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && varianceLoading && <p className="muted" role="status">{t("budgets.loadingVariance")}</p>}

      {selected && !varianceLoading && variance.length > 0 && (
        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data-table">
            <caption className="sr-only">{t("budgets.varianceCaption", { name: selectedName })}</caption>
            <thead>
              <tr>
                <th scope="col">{t("common.account")}</th>
                <th scope="col" className="amount-cell">{t("budgets.columnBudgeted")}</th>
                <th scope="col" className="amount-cell">{t("budgets.columnActual")}</th>
                <th scope="col" className="amount-cell">{t("budgets.columnVariance")}</th>
              </tr>
            </thead>
            <tbody>
              {variance.map((v) => (
                <tr key={v.accountCode}>
                  <td>{v.accountCode} — {v.accountName}</td>
                  <td className="amount-cell">{formatMinorDisplay(v.budgetedMinor, "MXN")}</td>
                  <td className="amount-cell">{formatMinorDisplay(v.actualMinor, "MXN")}</td>
                  <td className="amount-cell">{formatMinorDisplay(v.varianceMinor, "MXN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
