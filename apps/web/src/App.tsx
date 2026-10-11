import { useCallback, useEffect, useState } from "react";
import { api } from "./lib/api.js";
import { accountTypeLabel, formatMinorDisplay } from "./lib/format.js";
import type { CurrencyCode } from "@finllm/money";

type View = "overview" | "reconciliation";

type Me = {
  user?: { email: string };
  book?: { id: string };
};

type BalanceRow = {
  accountId: string;
  code: string;
  name: string;
  type: string;
  currencyCode: CurrencyCode;
  balanceMinor: string;
  includeInNetWorth: boolean;
};

type BalancesResponse = {
  balances: BalanceRow[];
  netWorth: string;
  netWorthMinor: string;
};

type UnclearedRow = {
  splitId: string;
  txnDate: string;
  description: string | null;
  debitMinor: string;
  creditMinor: string;
};

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [view, setView] = useState<View>("overview");
  const [balances, setBalances] = useState<BalancesResponse | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [reconcileAccountId, setReconcileAccountId] = useState("");
  const [uncleared, setUncleared] = useState<UnclearedRow[]>([]);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [instanceInitialized, setInstanceInitialized] = useState<boolean | null>(null);

  const refreshMe = useCallback(async () => {
    try {
      setMe(await api<Me>("/api/v1/me"));
    } catch {
      setMe(null);
    }
  }, []);

  const loadBalances = useCallback(async () => {
    setBalancesLoading(true);
    setBalancesError(null);
    try {
      setBalances(await api<BalancesResponse>("/api/v1/balances"));
    } catch (e) {
      setBalancesError(e instanceof Error ? e.message : "No se pudieron cargar los saldos");
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  useEffect(() => {
    api<{ initialized?: boolean }>("/api/v1/setup/status")
      .then((data) => setInstanceInitialized(Boolean(data.initialized)))
      .catch(() => setInstanceInitialized(null));
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (me?.user) loadBalances();
  }, [me?.user, loadBalances]);

  async function initialize() {
    setError(null);
    try {
      await api("/api/v1/setup/initialize", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName: "Owner" }),
      });
      await refreshMe();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al inicializar";
      if (message === "Instance already initialized") {
        setInstanceInitialized(true);
        setError("Esta instancia ya está configurada. Inicia sesión con tu correo y contraseña.");
      } else {
        setError(message);
      }
    }
  }

  async function login() {
    setError(null);
    try {
      await api("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await refreshMe();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar sesión");
    }
  }

  async function logout() {
    try {
      await api("/api/v1/auth/logout", { method: "POST" });
    } finally {
      setMe(null);
      setBalances(null);
      setUncleared([]);
    }
  }

  async function loadAccounts() {
    const data = await api<{ accounts: Array<{ id: string; name: string; code: string; type: string }> }>(
      "/api/v1/accounts",
    );
    const list = data.accounts.filter((a) => a.type === "ASSET" || a.type === "LIABILITY");
    setAccounts(list);
    if (!reconcileAccountId && list[0]) setReconcileAccountId(list[0].id);
  }

  async function loadUncleared() {
    if (!reconcileAccountId) return;
    setReconcileLoading(true);
    try {
      const data = await api<{ items: UnclearedRow[] }>(
        `/api/v1/transactions?accountId=${reconcileAccountId}&reconcileState=UNCLEARED&limit=100`,
      );
      setUncleared(data.items ?? []);
    } finally {
      setReconcileLoading(false);
    }
  }

  async function markReconciled(splitId: string) {
    await api(`/api/v1/splits/${splitId}/reconcile`, {
      method: "PATCH",
      body: JSON.stringify({ state: "RECONCILED" }),
    });
    await loadUncleared();
    await loadBalances();
  }

  useEffect(() => {
    if (me?.user && view === "reconciliation" && accounts.length === 0) {
      loadAccounts().catch(() => undefined);
    }
  }, [me?.user, view, accounts.length]);

  if (!me?.user) {
    return (
      <div className="auth-wrap">
        <a className="skip-link" href="#auth-main">Ir al contenido</a>
        <main id="auth-main" className="card auth-card">
          <h1>FinLLM</h1>
          <p className="muted">
            {instanceInitialized
              ? "Tu libro contable personal. Inicia sesión con el correo y la contraseña de la configuración inicial."
              : "Finanzas personales autoalojadas. Crea la primera cuenta de propietario para inicializar esta instancia."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (instanceInitialized) login();
              else initialize();
            }}
          >
            <div className="field">
              <label htmlFor="auth-email">Correo</label>
              <input
                id="auth-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="auth-password">
                {instanceInitialized ? "Contraseña" : "Contraseña (mín. 12 caracteres)"}
              </label>
              <input
                id="auth-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={instanceInitialized ? "current-password" : "new-password"}
                minLength={instanceInitialized ? undefined : 12}
                required
              />
            </div>
            <div className="toolbar">
              {!instanceInitialized && (
                <button type="submit" className="btn">
                  Inicializar instancia
                </button>
              )}
              {instanceInitialized && (
                <button type="submit" className="btn">
                  Iniciar sesión
                </button>
              )}
              {!instanceInitialized && (
                <button type="button" className="btn btn-ghost" onClick={() => login()}>
                  Ya tengo cuenta
                </button>
              )}
            </div>
            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}
          </form>
        </main>
      </div>
    );
  }

  const netWorthDisplay =
    balances?.netWorthMinor != null
      ? formatMinorDisplay(balances.netWorthMinor, "MXN")
      : balances?.netWorth ?? "—";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#app-main">Ir al contenido</a>
      <header className="app-header">
        <p className="brand">FinLLM</p>
        <nav className="app-nav" aria-label="Principal">
          <button
            type="button"
            className="nav-btn"
            aria-current={view === "overview" ? "page" : undefined}
            onClick={() => setView("overview")}
          >
            Resumen
          </button>
          <button
            type="button"
            className="nav-btn"
            aria-current={view === "reconciliation" ? "page" : undefined}
            onClick={() => setView("reconciliation")}
          >
            Conciliación
          </button>
        </nav>
        <div className="header-meta">
          <span>{me.user.email}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => logout()}>
            Salir
          </button>
        </div>
      </header>

      <main id="app-main" className="app-main">
        {view === "overview" && (
          <>
            <section className="card hero-patrimonio" aria-labelledby="patrimonio-heading">
              <p className="label" id="patrimonio-heading">Patrimonio neto (MXN)</p>
              <p className="amount" aria-live="polite">
                {balancesLoading ? "Cargando…" : netWorthDisplay}
              </p>
              {balancesError && (
                <p className="alert" role="alert">{balancesError}</p>
              )}
            </section>
            <section className="card" aria-labelledby="cuentas-heading">
              <div className="toolbar">
                <h2 id="cuentas-heading" style={{ margin: 0, flex: 1 }}>Cuentas</h2>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadBalances()} disabled={balancesLoading}>
                  Actualizar
                </button>
              </div>
              {!balancesLoading && balances && balances.balances.length === 0 && (
                <p className="muted">No hay movimientos publicados todavía.</p>
              )}
              {balances && balances.balances.length > 0 && (
                <div className="table-wrap">
                  <table className="data-table">
                    <caption className="sr-only">Saldos por cuenta</caption>
                    <thead>
                      <tr>
                        <th scope="col">Código</th>
                        <th scope="col">Cuenta</th>
                        <th scope="col">Tipo</th>
                        <th scope="col" className="amount-cell">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balances.balances.map((row) => (
                        <tr key={row.accountId}>
                          <td>{row.code}</td>
                          <td>{row.name}</td>
                          <td>{accountTypeLabel(row.type)}</td>
                          <td className="amount-cell">
                            {formatMinorDisplay(row.balanceMinor, row.currencyCode)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {view === "reconciliation" && (
          <section className="card" aria-labelledby="reconcile-heading">
            <h2 id="reconcile-heading">Conciliación</h2>
            <p className="muted">Marca movimientos no conciliados como conciliados cuando coincidan con tu estado de cuenta.</p>
            <div className="toolbar">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadAccounts()}>
                Cargar cuentas
              </button>
            </div>
            {accounts.length > 0 && (
              <div className="field">
                <label htmlFor="reconcile-account">Cuenta</label>
                <select
                  id="reconcile-account"
                  value={reconcileAccountId}
                  onChange={(e) => setReconcileAccountId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {reconcileAccountId && (
              <button
                type="button"
                className="btn"
                onClick={() => loadUncleared()}
                disabled={reconcileLoading}
              >
                {reconcileLoading ? "Cargando…" : "Ver movimientos sin conciliar"}
              </button>
            )}
            {uncleared.length === 0 && reconcileAccountId && !reconcileLoading && (
              <p className="muted" style={{ marginTop: "1rem" }}>
                No hay partidas sin conciliar cargadas. Pulsa el botón anterior para buscarlas.
              </p>
            )}
            {uncleared.length > 0 && (
              <ul className="split-list" style={{ marginTop: "1rem" }}>
                {uncleared.map((row) => (
                  <li key={row.splitId} className="split-row">
                    <span>
                      <strong>{row.txnDate}</strong>
                      {" — "}
                      {row.description ?? "Sin descripción"}
                      {" "}
                      <span className="muted">
                        (D {formatMinorDisplay(row.debitMinor, "MXN")} / C {formatMinorDisplay(row.creditMinor, "MXN")})
                      </span>
                    </span>
                    <button type="button" className="btn btn-sm" onClick={() => markReconciled(row.splitId)}>
                      Marcar conciliado
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
