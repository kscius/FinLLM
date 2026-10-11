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
      setError(err instanceof Error ? err.message : "No se pudieron cargar los presupuestos");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function loadVariance(b: Budget) {
    setSelected(b.id);
    setSelectedName(b.name);
    setVarianceLoading(true);
    setStatus(`Cargando variación de ${b.name}…`);
    setError(null);
    try {
      const data = await api<{ lines: VarianceLine[] }>(`/api/v1/budgets/${b.id}/variance`);
      setVariance(data.lines);
      setStatus(
        data.lines.length === 0
          ? `Sin líneas de variación para ${b.name}.`
          : `Variación cargada para ${b.name} (${data.lines.length} líneas).`,
      );
    } catch (err) {
      setVariance([]);
      setError(err instanceof Error ? err.message : "Error al cargar variación");
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
      setError("Indica cuenta de gasto y monto presupuestado.");
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
      setStatus("Presupuesto creado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear presupuesto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="view-title">
      <p className="muted">Crea un presupuesto y compara contra movimientos del periodo.</p>
      <p className="sr-only" aria-live="polite">{status}</p>
      <form onSubmit={createBudget} aria-busy={busy}>
        <div className="field">
          <label htmlFor="bud-name">Nombre</label>
          <input id="bud-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-grid form-grid--2">
          <div className="field">
            <label htmlFor="bud-start">Inicio</label>
            <input id="bud-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="bud-end">Fin</label>
            <input id="bud-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="bud-acc">Cuenta de gasto</label>
          <select
            id="bud-acc"
            value={lineAccountId || expenseAccounts[0]?.id || ""}
            onChange={(e) => setLineAccountId(e.target.value)}
            disabled={expenseAccounts.length === 0}
          >
            {expenseAccounts.length === 0 ? (
              <option value="">Sin cuentas de gasto</option>
            ) : (
              expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))
            )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bud-amt">Monto presupuestado (MXN)</label>
          <input id="bud-amt" value={lineAmount} onChange={(e) => setLineAmount(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-sm" disabled={busy || expenseAccounts.length === 0}>
          {busy ? "Creando…" : "Crear presupuesto"}
        </button>
      </form>
      {error && <p className="alert" role="alert">{error}</p>}

      {listLoading && <p className="muted" role="status">Cargando presupuestos…</p>}
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
                aria-label={`Ver variación de ${b.name}`}
                onClick={() => loadVariance(b)}
              >
                Ver variación
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && varianceLoading && <p className="muted" role="status">Cargando variación…</p>}

      {selected && !varianceLoading && variance.length > 0 && (
        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data-table">
            <caption className="sr-only">Variación del presupuesto {selectedName}</caption>
            <thead>
              <tr>
                <th scope="col">Cuenta</th>
                <th scope="col" className="amount-cell">Presupuesto</th>
                <th scope="col" className="amount-cell">Real</th>
                <th scope="col" className="amount-cell">Variación</th>
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
