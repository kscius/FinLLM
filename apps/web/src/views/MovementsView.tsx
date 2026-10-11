import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../components/EmptyState.js";
import { parseToMinor } from "@finllm/money";
import { api } from "../lib/api.js";
import { postTransactionViaConfirm } from "../lib/confirm-post.js";
import type { AccountRow } from "../lib/types.js";

type Props = {
  accounts: AccountRow[];
  onPosted: () => void;
  onAccountsChanged: () => void;
};

export function MovementsView({ accounts, onPosted, onAccountsChanged }: Props) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [assetId, setAssetId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"ASSET" | "EXPENSE" | "INCOME">("ASSET");

  const assets = accounts.filter((a) => a.type === "ASSET" && !a.isSystem);
  const expenses = accounts.filter((a) => a.type === "EXPENSE" && !a.isSystem);
  const incomes = accounts.filter((a) => a.type === "INCOME" && !a.isSystem);
  const categories = kind === "expense" ? expenses : incomes;
  const canPost = assets.length > 0 && categories.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const payFrom = assetId || assets[0]?.id;
    const cat = categoryId || categories[0]?.id;
    if (!payFrom || !cat) {
      setError("Crea al menos una cuenta de activo y una de gasto o ingreso.");
      return;
    }
    setBusy(true);
    try {
      const minor = parseToMinor(amount, "MXN");
      const abs = minor < 0n ? -minor : minor;
      const splits =
        kind === "expense"
          ? [
              { accountId: payFrom, debitMinor: "0", creditMinor: abs.toString() },
              { accountId: cat, debitMinor: abs.toString(), creditMinor: "0" },
            ]
          : [
              { accountId: payFrom, debitMinor: abs.toString(), creditMinor: "0" },
              { accountId: cat, debitMinor: "0", creditMinor: abs.toString() },
            ];
      await postTransactionViaConfirm({ txnDate, description, splits });
      setAmount("");
      setDescription("");
      setSuccess("Movimiento registrado correctamente.");
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setBusy(false);
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await api("/api/v1/accounts", {
        method: "POST",
        body: JSON.stringify({
          code: newCode,
          name: newName,
          type: newType,
          subtype: newType === "ASSET" ? "CASH" : newType === "EXPENSE" ? "EXPENSE_GENERIC" : "INCOME_GENERIC",
          currencyCode: "MXN",
        }),
      });
      setNewCode("");
      setNewName("");
      setSuccess("Cuenta creada.");
      onAccountsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear cuenta");
    }
  }

  const errorId = "movements-error";

  return (
    <section className="card" aria-labelledby="view-title">
      <p className="muted">{t("movements.intro")}</p>
      {!canPost && (
        <EmptyState illustration="wallet" title={t("movements.missingAccountsTitle")}>
          {t("movements.missingAccounts", {
            kind: kind === "expense" ? t("movements.expenseKind") : t("movements.incomeKind"),
          })}
        </EmptyState>
      )}
      <form onSubmit={submit} aria-busy={busy}>
        <div role="group" aria-label={t("movements.typeGroup")} className="segmented">
          <button
            type="button"
            className="segmented-btn"
            aria-pressed={kind === "expense"}
            onClick={() => setKind("expense")}
          >
            {t("movements.expense")}
          </button>
          <button
            type="button"
            className="segmented-btn"
            aria-pressed={kind === "income"}
            onClick={() => setKind("income")}
          >
            {t("movements.income")}
          </button>
        </div>
        <div className="field">
          <label htmlFor="txn-date">Fecha</label>
          <input id="txn-date" type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="txn-amount">Monto (MXN)</label>
          <input
            id="txn-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        <div className="field">
          <label htmlFor="txn-desc">Descripción</label>
          <input id="txn-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="txn-asset">Cuenta de pago / depósito</label>
          <select
            id="txn-asset"
            value={assetId || assets[0]?.id || ""}
            onChange={(e) => setAssetId(e.target.value)}
            disabled={assets.length === 0}
          >
            {assets.length === 0 ? (
              <option value="">Sin cuentas de activo</option>
            ) : (
              assets.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))
            )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="txn-cat">{kind === "expense" ? "Categoría de gasto" : "Categoría de ingreso"}</label>
          <select
            id="txn-cat"
            value={categoryId || categories[0]?.id || ""}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={categories.length === 0}
          >
            {categories.length === 0 ? (
              <option value="">Sin categorías</option>
            ) : (
              categories.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))
            )}
          </select>
        </div>
        <button type="submit" className="btn" disabled={busy || !canPost} aria-busy={busy}>
          {busy ? "Guardando…" : "Registrar"}
        </button>
        {success && <p className="status-banner status-banner--success" role="status">{success}</p>}
        {error && <p className="alert" id={errorId} role="alert">{error}</p>}
      </form>

      <details className="card" style={{ marginTop: "1.25rem", padding: "0.75rem" }}>
        <summary>Nueva cuenta</summary>
        <form onSubmit={createAccount} style={{ marginTop: "0.75rem" }}>
          <div className="field">
            <label htmlFor="acc-code">Código</label>
            <input id="acc-code" value={newCode} onChange={(e) => setNewCode(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="acc-name">Nombre</label>
            <input id="acc-name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="acc-type">Tipo</label>
            <select id="acc-type" value={newType} onChange={(e) => setNewType(e.target.value as typeof newType)}>
              <option value="ASSET">Activo</option>
              <option value="EXPENSE">Gasto</option>
              <option value="INCOME">Ingreso</option>
            </select>
          </div>
          <button type="submit" className="btn btn-ghost btn-sm">Crear cuenta</button>
        </form>
      </details>
    </section>
  );
}
