import { useState } from "react";
import { api } from "../lib/api.js";
import type { AccountRow } from "../lib/types.js";

type PreviewRow = { date: string; amount: string; description: string; externalRef: string };

type Props = {
  accounts: AccountRow[];
  onImported: () => void;
};

export function ImportCsvView({ accounts, onImported }: Props) {
  const [csv, setCsv] = useState("");
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [assetId, setAssetId] = useState("");
  const [expenseId, setExpenseId] = useState("");
  const [incomeId, setIncomeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assets = accounts.filter((a) => a.type === "ASSET" && !a.isSystem);
  const expenses = accounts.filter((a) => a.type === "EXPENSE" && !a.isSystem);
  const incomes = accounts.filter((a) => a.type === "INCOME" && !a.isSystem);

  async function preview() {
    setError(null);
    setBusy(true);
    try {
      const data = await api<{ importJobId: string; rows: PreviewRow[] }>("/api/v1/imports/csv/preview", {
        method: "POST",
        body: JSON.stringify({ content: csv, fileName: "upload.csv" }),
      });
      setImportJobId(data.importJobId);
      setRows(data.rows ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vista previa fallida");
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!importJobId) return;
    const a = assetId || assets[0]?.id;
    const e = expenseId || expenses[0]?.id;
    const i = incomeId || incomes[0]?.id;
    if (!a || !e || !i) {
      setError("Selecciona cuentas por defecto para activo, gasto e ingreso.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/v1/imports/${importJobId}/commit`, {
        method: "POST",
        body: JSON.stringify({
          defaultAssetAccountId: a,
          defaultExpenseAccountId: e,
          defaultIncomeAccountId: i,
        }),
      });
      setCsv("");
      setRows([]);
      setImportJobId(null);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Importación fallida");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="import-heading">
      <h2 id="import-heading">Importar CSV</h2>
      <p className="muted">Formato: date,amount,description,external_ref (encabezado opcional).</p>
      <div className="field">
        <label htmlFor="csv-content">Contenido CSV</label>
        <textarea
          id="csv-content"
          rows={8}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={"date,amount,description,external_ref\n2026-01-15,-50.00,Cafe,ref-1"}
        />
      </div>
      <button type="button" className="btn btn-ghost" onClick={() => preview()} disabled={busy || !csv.trim()}>
        Vista previa
      </button>
      {rows.length > 0 && (
        <>
          <p className="muted" style={{ marginTop: "1rem" }}>{rows.length} filas listas para importar.</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r) => (
                  <tr key={r.externalRef}>
                    <td>{r.date}</td>
                    <td>{r.amount}</td>
                    <td>{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="field">
            <label htmlFor="imp-asset">Cuenta activo</label>
            <select id="imp-asset" value={assetId || assets[0]?.id || ""} onChange={(e) => setAssetId(e.target.value)}>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imp-exp">Cuenta gasto</label>
            <select id="imp-exp" value={expenseId || expenses[0]?.id || ""} onChange={(e) => setExpenseId(e.target.value)}>
              {expenses.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imp-inc">Cuenta ingreso</label>
            <select id="imp-inc" value={incomeId || incomes[0]?.id || ""} onChange={(e) => setIncomeId(e.target.value)}>
              {incomes.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn" onClick={() => commit()} disabled={busy}>
            Confirmar importación
          </button>
        </>
      )}
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}
