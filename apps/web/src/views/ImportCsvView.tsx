import { useRef, useState } from "react";
import { EmptyState } from "../components/EmptyState.js";
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
  const [status, setStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const assets = accounts.filter((a) => a.type === "ASSET" && !a.isSystem);
  const expenses = accounts.filter((a) => a.type === "EXPENSE" && !a.isSystem);
  const incomes = accounts.filter((a) => a.type === "INCOME" && !a.isSystem);
  const canCommit = assets.length > 0 && expenses.length > 0 && incomes.length > 0;

  async function preview() {
    setError(null);
    setStatus("");
    setBusy(true);
    try {
      const data = await api<{ importJobId: string; rows: PreviewRow[] }>("/api/v1/imports/csv/preview", {
        method: "POST",
        body: JSON.stringify({ content: csv, fileName: "upload.csv" }),
      });
      setImportJobId(data.importJobId);
      setRows(data.rows ?? []);
      const n = data.rows?.length ?? 0;
      setStatus(n === 0 ? "Vista previa sin filas." : `${n} filas listas para importar.`);
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
    setStatus("");
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
      setStatus("Importación completada.");
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Importación fallida");
    } finally {
      setBusy(false);
    }
  }

  function onFilePicked(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setCsv(text);
      setStatus(`Archivo ${file.name} cargado. Revisa y pulsa Vista previa.`);
    };
    reader.readAsText(file);
  }

  const previewCount = rows.length;
  const shown = rows.slice(0, 20);

  return (
    <section className="card" aria-labelledby="view-title">
      <p className="muted">Formato: date,amount,description,external_ref (encabezado opcional).</p>
      <p className="sr-only" aria-live="polite">{status}</p>
      <div className="file-input-wrap">
        <label className="btn btn-ghost btn-sm" htmlFor="csv-file">
          Elegir archivo CSV
        </label>
        <input
          ref={fileRef}
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => onFilePicked(e.target.files?.[0])}
        />
        <span className="field-hint">O pega el contenido abajo.</span>
      </div>
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
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => preview()}
        disabled={busy || !csv.trim()}
        aria-busy={busy}
      >
        {busy ? "Procesando…" : "Vista previa"}
      </button>
      {previewCount > 0 && (
        <>
          <p className="muted" style={{ marginTop: "1rem" }} aria-live="polite">
            {previewCount} filas listas para importar.
            {previewCount > 20 && " Mostrando las primeras 20 en la tabla."}
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">
                Vista previa de importación ({shown.length} de {previewCount} filas)
              </caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Monto</th>
                  <th scope="col">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, idx) => (
                  <tr key={`${r.externalRef}-${r.date}-${idx}`}>
                    <td>{r.date}</td>
                    <td>{r.amount}</td>
                    <td>{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!canCommit && (
            <EmptyState illustration="upload" title="Cuentas incompletas">
              Crea cuentas de activo, gasto e ingreso antes de confirmar la importación.
            </EmptyState>
          )}
          <div className="field">
            <label htmlFor="imp-asset">Cuenta activo</label>
            <select id="imp-asset" value={assetId || assets[0]?.id || ""} onChange={(e) => setAssetId(e.target.value)} disabled={assets.length === 0}>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imp-exp">Cuenta gasto</label>
            <select id="imp-exp" value={expenseId || expenses[0]?.id || ""} onChange={(e) => setExpenseId(e.target.value)} disabled={expenses.length === 0}>
              {expenses.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imp-inc">Cuenta ingreso</label>
            <select id="imp-inc" value={incomeId || incomes[0]?.id || ""} onChange={(e) => setIncomeId(e.target.value)} disabled={incomes.length === 0}>
              {incomes.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn" onClick={() => commit()} disabled={busy || !canCommit} aria-busy={busy}>
            {busy ? "Importando…" : "Confirmar importación"}
          </button>
        </>
      )}
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}
