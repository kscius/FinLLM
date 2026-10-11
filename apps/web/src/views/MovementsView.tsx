import { useState } from "react";
import { parseToMinor } from "@finllm/money";
import { api } from "../lib/api.js";
import type { AccountRow } from "../lib/types.js";

type Props = {
  accounts: AccountRow[];
  onPosted: () => void;
  onAccountsChanged: () => void;
};

export function MovementsView({ accounts, onPosted, onAccountsChanged }: Props) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [txnDate, setTxnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [assetId, setAssetId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"ASSET" | "EXPENSE" | "INCOME">("ASSET");

  const assets = accounts.filter((a) => a.type === "ASSET" && !a.isSystem);
  const expenses = accounts.filter((a) => a.type === "EXPENSE" && !a.isSystem);
  const incomes = accounts.filter((a) => a.type === "INCOME" && !a.isSystem);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payFrom = assetId || assets[0]?.id;
    const cat = categoryId || (kind === "expense" ? expenses[0]?.id : incomes[0]?.id);
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
      await api("/api/v1/transactions", {
        method: "POST",
        body: JSON.stringify({ txnDate, description, splits }),
      });
      setAmount("");
      setDescription("");
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
      onAccountsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear cuenta");
    }
  }

  return (
    <section className="card" aria-labelledby="movements-heading">
      <h2 id="movements-heading">Movimientos</h2>
      <p className="muted">Registra un gasto o ingreso en MXN (doble partida automática).</p>
      <form onSubmit={submit}>
        <div className="toolbar">
          <button
            type="button"
            className={`nav-btn ${kind === "expense" ? "" : "btn-ghost"}`}
            aria-pressed={kind === "expense"}
            onClick={() => setKind("expense")}
          >
            Gasto
          </button>
          <button
            type="button"
            className={`nav-btn ${kind === "income" ? "" : "btn-ghost"}`}
            aria-pressed={kind === "income"}
            onClick={() => setKind("income")}
          >
            Ingreso
          </button>
        </div>
        <div className="field">
          <label htmlFor="txn-date">Fecha</label>
          <input id="txn-date" type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="txn-amount">Monto (MXN)</label>
          <input id="txn-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="txn-desc">Descripción</label>
          <input id="txn-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="txn-asset">Cuenta de pago / depósito</label>
          <select id="txn-asset" value={assetId || assets[0]?.id || ""} onChange={(e) => setAssetId(e.target.value)}>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="txn-cat">{kind === "expense" ? "Categoría de gasto" : "Categoría de ingreso"}</label>
          <select
            id="txn-cat"
            value={categoryId || (kind === "expense" ? expenses[0]?.id : incomes[0]?.id) || ""}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {(kind === "expense" ? expenses : incomes).map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn" disabled={busy}>{busy ? "Guardando…" : "Registrar"}</button>
        {error && <p className="alert" role="alert">{error}</p>}
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
