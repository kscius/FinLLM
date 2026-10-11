import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../components/EmptyState.js";
import { api } from "../lib/api.js";
import type { AccountRow } from "../lib/types.js";

type PreviewRow = { date: string; amount: string; description: string; externalRef: string };

type Props = {
  accounts: AccountRow[];
  onImported: () => void;
};

export function ImportCsvView({ accounts, onImported }: Props) {
  const { t } = useTranslation();
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
      setStatus(n === 0 ? t("import.previewEmpty") : t("import.previewReady", { count: n }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("import.previewFailed"));
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
      setError(t("import.selectDefaultAccounts"));
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
      setStatus(t("import.importComplete"));
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("import.importFailed"));
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
      setStatus(t("import.fileLoaded", { name: file.name }));
    };
    reader.readAsText(file);
  }

  const previewCount = rows.length;
  const shown = rows.slice(0, 20);

  return (
    <section className="card" aria-labelledby="view-title">
      <p className="muted">{t("import.formatHint")}</p>
      <p className="sr-only" aria-live="polite">{status}</p>
      <div className="file-input-wrap">
        <label className="btn btn-ghost btn-sm" htmlFor="csv-file">
          {t("import.chooseFile")}
        </label>
        <input
          ref={fileRef}
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => onFilePicked(e.target.files?.[0])}
        />
        <span className="field-hint">{t("import.pasteHint")}</span>
      </div>
      <div className="field">
        <label htmlFor="csv-content">{t("import.csvContent")}</label>
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
        {busy ? t("common.processing") : t("import.preview")}
      </button>
      {previewCount > 0 && (
        <>
          <p className="muted" style={{ marginTop: "1rem" }} aria-live="polite">
            {t("import.rowsReady", { count: previewCount })}
            {previewCount > 20 && t("import.rowsReadyTruncated")}
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">
                {t("import.previewCaption", { shown: shown.length, total: previewCount })}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t("common.date")}</th>
                  <th scope="col">{t("common.amount")}</th>
                  <th scope="col">{t("common.description")}</th>
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
            <EmptyState illustration="upload" title={t("import.accountsIncompleteTitle")}>
              {t("import.accountsIncomplete")}
            </EmptyState>
          )}
          <div className="field">
            <label htmlFor="imp-asset">{t("import.assetAccount")}</label>
            <select id="imp-asset" value={assetId || assets[0]?.id || ""} onChange={(e) => setAssetId(e.target.value)} disabled={assets.length === 0}>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imp-exp">{t("import.expenseAccount")}</label>
            <select id="imp-exp" value={expenseId || expenses[0]?.id || ""} onChange={(e) => setExpenseId(e.target.value)} disabled={expenses.length === 0}>
              {expenses.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="imp-inc">{t("import.incomeAccount")}</label>
            <select id="imp-inc" value={incomeId || incomes[0]?.id || ""} onChange={(e) => setIncomeId(e.target.value)} disabled={incomes.length === 0}>
              {incomes.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn" onClick={() => commit()} disabled={busy || !canCommit} aria-busy={busy}>
            {busy ? t("common.importing") : t("import.confirmImport")}
          </button>
        </>
      )}
      {error && <p className="alert" role="alert">{error}</p>}
    </section>
  );
}
