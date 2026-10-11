import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./components/ThemeToggle.js";
import { api } from "./lib/api.js";
import { accountTypeLabel, formatMinorDisplay } from "./lib/format.js";
import { setLocationHashForView, VIEW_META, viewFromLocationHash } from "./lib/navigation.js";
import type { AccountRow, AppView, BalanceRow } from "./lib/types.js";
import { BudgetsView } from "./views/BudgetsView.js";
import { ImportCsvView } from "./views/ImportCsvView.js";
import { InvestmentsView } from "./views/InvestmentsView.js";
import { MovementsView } from "./views/MovementsView.js";

type Me = {
  user?: { email: string };
  book?: { id: string };
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
  const [view, setView] = useState<AppView>("overview");
  const [balances, setBalances] = useState<BalancesResponse | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [allAccounts, setAllAccounts] = useState<AccountRow[]>([]);
  const [reconcileAccountId, setReconcileAccountId] = useState("");
  const [reconcileFrom, setReconcileFrom] = useState("");
  const [reconcileTo, setReconcileTo] = useState("");
  const [uncleared, setUncleared] = useState<UnclearedRow[]>([]);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [instanceInitialized, setInstanceInitialized] = useState<boolean | null>(null);
  const [authBooting, setAuthBooting] = useState(true);
  const [pageStatus, setPageStatus] = useState("");
  const [reconcileFeedback, setReconcileFeedback] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const [reconcileRowBusy, setReconcileRowBusy] = useState<string | null>(null);
  const viewTitleRef = useRef<HTMLHeadingElement>(null);

  const navigateToView = useCallback((next: AppView) => {
    setView(next);
    setLocationHashForView(next);
    setPageStatus(`Vista actual: ${VIEW_META[next].documentTitle}`);
  }, []);

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
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ initialized?: boolean }>("/api/v1/setup/status");
        if (!cancelled) setInstanceInitialized(Boolean(data.initialized));
      } catch {
        if (!cancelled) setInstanceInitialized(null);
      }
      await refreshMe();
      if (!cancelled) setAuthBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  useEffect(() => {
    const fromHash = viewFromLocationHash();
    if (fromHash) setView(fromHash);
    else if (!window.location.hash) setLocationHashForView("overview");

    const onHash = () => {
      const v = viewFromLocationHash();
      if (v) setView(v);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.title = `FinLLM — ${VIEW_META[view].documentTitle}`;
    viewTitleRef.current?.focus();
  }, [view]);

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

  const loadAllAccounts = useCallback(async () => {
    const data = await api<{ accounts: AccountRow[] }>("/api/v1/accounts");
    setAllAccounts(data.accounts);
  }, []);

  async function loadAccounts() {
    const data = await api<{ accounts: Array<{ id: string; name: string; code: string; type: string }> }>(
      "/api/v1/accounts",
    );
    const list = data.accounts.filter((a) => a.type === "ASSET" || a.type === "LIABILITY");
    setAccounts(list);
    if (!reconcileAccountId && list[0]) setReconcileAccountId(list[0].id);
    setAllAccounts(data.accounts as AccountRow[]);
  }

  async function loadUncleared() {
    if (!reconcileAccountId) return;
    setReconcileLoading(true);
    try {
      const params = new URLSearchParams({
        accountId: reconcileAccountId,
        reconcileState: "UNCLEARED",
        limit: "100",
      });
      if (reconcileFrom) params.set("fromDate", reconcileFrom);
      if (reconcileTo) params.set("toDate", reconcileTo);
      const data = await api<{ items: UnclearedRow[] }>(`/api/v1/transactions?${params}`);
      setUncleared(data.items ?? []);
    } finally {
      setReconcileLoading(false);
    }
  }

  async function markReconciled(splitId: string) {
    setReconcileFeedback(null);
    setReconcileRowBusy(splitId);
    try {
      await api(`/api/v1/splits/${splitId}/reconcile`, {
        method: "PATCH",
        body: JSON.stringify({ state: "RECONCILED" }),
      });
      setReconcileFeedback({ text: "Partida marcada como conciliada.", kind: "success" });
      await loadUncleared();
      await loadBalances();
    } catch (e) {
      setReconcileFeedback({
        text: e instanceof Error ? e.message : "No se pudo conciliar la partida",
        kind: "error",
      });
    } finally {
      setReconcileRowBusy(null);
    }
  }

  useEffect(() => {
    if (!me?.user) return;
    if (
      (view === "reconciliation" && accounts.length === 0) ||
      view === "movements" ||
      view === "import" ||
      view === "budgets"
    ) {
      loadAllAccounts().catch(() => undefined);
      if (view === "reconciliation" && accounts.length === 0) {
        loadAccounts().catch(() => undefined);
      }
    }
  }, [me?.user, view, accounts.length, loadAllAccounts]);

  if (!me?.user) {
    if (authBooting) {
      return (
        <div className="auth-wrap">
          <main className="card auth-card auth-loading" aria-busy="true">
            <p className="muted">Comprobando instancia…</p>
          </main>
        </div>
      );
    }
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
        <h1 className="brand">FinLLM</h1>
        <nav className="app-nav" aria-label="Principal">
          {(Object.keys(VIEW_META) as AppView[]).map((key) => (
            <button
              key={key}
              type="button"
              className="nav-btn"
              aria-current={view === key ? "page" : undefined}
              onClick={() => navigateToView(key)}
            >
              {VIEW_META[key].navLabel}
            </button>
          ))}
        </nav>
        <div className="header-meta">
          <ThemeToggle />
          <span className="header-email" title={me.user.email}>{me.user.email}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => logout()}>
            Salir
          </button>
        </div>
      </header>

      <main id="app-main" className="app-main">
        <p className="sr-only live-status" aria-live="polite" aria-atomic="true">{pageStatus}</p>
        <h2 ref={viewTitleRef} tabIndex={-1} className="view-title" id="view-title">
          {VIEW_META[view].documentTitle}
        </h2>
        {view === "overview" && (
          <>
            <section className="card hero-patrimonio" aria-labelledby="patrimonio-heading">
              <h2 className="label" id="patrimonio-heading">Patrimonio neto (MXN)</h2>
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

        {view === "movements" && (
          <MovementsView
            accounts={allAccounts}
            onPosted={() => {
              loadBalances();
              loadAllAccounts();
            }}
            onAccountsChanged={() => loadAllAccounts()}
          />
        )}
        {view === "import" && (
          <ImportCsvView
            accounts={allAccounts}
            onImported={() => {
              loadBalances();
              loadAllAccounts();
            }}
          />
        )}
        {view === "budgets" && <BudgetsView accounts={allAccounts} />}
        {view === "investments" && (
          <InvestmentsView balances={balances?.balances ?? null} balancesLoading={balancesLoading} />
        )}

        {view === "reconciliation" && (
            <section className="card" aria-labelledby="reconcile-heading">
            <h2 id="reconcile-heading" className="sr-only">Conciliación</h2>
            <p className="muted">Filtra por periodo del estado de cuenta y marca partidas conciliadas.</p>
            {reconcileFeedback && (
              <p
                className={`status-banner ${reconcileFeedback.kind === "success" ? "status-banner--success" : "status-banner--error"}`}
                role="status"
              >
                {reconcileFeedback.text}
              </p>
            )}
            <div className="toolbar">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadAccounts()}>
                Cargar cuentas
              </button>
            </div>
            {accounts.length > 0 && (
              <>
              <div className="form-grid form-grid--2">
                <div className="field">
                  <label htmlFor="reconcile-from">Desde (opcional)</label>
                  <input id="reconcile-from" type="date" value={reconcileFrom} onChange={(e) => setReconcileFrom(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="reconcile-to">Hasta (opcional)</label>
                  <input id="reconcile-to" type="date" value={reconcileTo} onChange={(e) => setReconcileTo(e.target.value)} />
                </div>
              </div>
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
              </>
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
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={reconcileRowBusy === row.splitId}
                      aria-busy={reconcileRowBusy === row.splitId}
                      aria-label={`Marcar conciliado: ${row.txnDate}, ${row.description ?? "Sin descripción"}`}
                      onClick={() => markReconciled(row.splitId)}
                    >
                      {reconcileRowBusy === row.splitId ? "Guardando…" : "Marcar conciliado"}
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
