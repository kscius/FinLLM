import { useCallback, useEffect, useState } from "react";
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
  const [list, setList] = useState<Budget[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [variance, setVariance] = useState<VarianceLine[]>([]);
  const [name, setName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [lineAccountId, setLineAccountId] = useState("");
  const [lineAmount, setLineAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE" && !a.isSystem);

  const load = useCallback(async () => {
    const data = await api<{ budgets: Budget[] }>("/api/v1/budgets");
    setList(data.budgets);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function loadVariance(id: string) {
    setSelected(id);
    const data = await api<{ lines: VarianceLine[] }>(`/api/v1/budgets/${id}/variance`);
    setVariance(data.lines);
  }

  async function createBudget(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const acc = lineAccountId || expenseAccounts[0]?.id;
    if (!acc || !lineAmount) {
      setError("Indica cuenta de gasto y monto presupuestado.");
      return;
    }
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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear presupuesto");
    }
  }

  return (
    <section className="card" aria-labelledby="budgets-heading">
      <h2 id="budgets-heading">Presupuestos</h2>
      <p className="muted">Crea un presupuesto y compara contra movimientos del periodo.</p>
      <form onSubmit={createBudget}>
        <div className="field">
          <label htmlFor="bud-name">Nombre</label>
          <input id="bud-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="bud-start">Inicio</label>
          <input id="bud-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="bud-end">Fin</label>
          <input id="bud-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="bud-acc">Cuenta de gasto</label>
          <select id="bud-acc" value={lineAccountId || expenseAccounts[0]?.id || ""} onChange={(e) => setLineAccountId(e.target.value)}>
            {expenseAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bud-amt">Monto presupuestado (MXN)</label>
          <input id="bud-amt" value={lineAmount} onChange={(e) => setLineAmount(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-sm">Crear presupuesto</button>
      </form>
      {error && <p className="alert" role="alert">{error}</p>}

      {list.length > 0 && (
        <ul className="split-list" style={{ marginTop: "1.25rem" }}>
          {list.map((b) => (
            <li key={b.id} className="split-row">
              <span>{b.name} ({b.periodStart} — {b.periodEnd})</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => loadVariance(b.id)}>
                Ver variación
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && variance.length > 0 && (
        <div className="table-wrap" style={{ marginTop: "1rem" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cuenta</th>
                <th className="amount-cell">Presupuesto</th>
                <th className="amount-cell">Real</th>
                <th className="amount-cell">Variación</th>
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
