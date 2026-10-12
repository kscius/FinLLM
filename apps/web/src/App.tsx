import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BalanceBreakdown } from "./components/BalanceBreakdown.js";
import { BrandLockup } from "./components/BrandLockup.js";
import { EmptyState } from "./components/EmptyState.js";
import { LanguageToggle } from "./components/LanguageToggle.js";
import { NavIcon } from "./components/NavIcon.js";
import { OverviewCharts } from "./components/OverviewCharts.js";
import { MobileNav } from "./components/MobileNav.js";
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
  const { t, i18n } = useTranslation();
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
    setPageStatus(t("status.view", { title: t(VIEW_META[next].titleKey) }));
  }, [t]);

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
      setBalancesError(e instanceof Error ? e.message : t("errors.balances"));
    } finally {
      setBalancesLoading(false);
    }
  }, [t]);

  const viewTitle = t(VIEW_META[view].titleKey);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ initialized?: boolean }>("/api/v1/setup/status");
        if (!cancelled) setInstanceInitialized(Boolean(data.initialized));
      } catch {
        // Production hides setup status when already initialized (403).
        if (!cancelled) setInstanceInitialized(true);
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
    document.title = `${t("app.name")} — ${viewTitle}`;
    viewTitleRef.current?.focus();
  }, [view, viewTitle, t, i18n.language]);

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
      const message = e instanceof Error ? e.message : t("errors.init");
      if (message === "Instance already initialized") {
        setInstanceInitialized(true);
        setError(t("auth.alreadyInitialized"));
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
      setError(e instanceof Error ? e.message : t("errors.login"));
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
      setReconcileFeedback({ text: t("reconciliation.reconciledSuccess"), kind: "success" });
      await loadUncleared();
      await loadBalances();
    } catch (e) {
      setReconcileFeedback({
        text: e instanceof Error ? e.message : t("errors.reconcile"),
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
            <p className="muted">{t("auth.checking")}</p>
          </main>
        </div>
      );
    }
    return (
      <div className="auth-wrap">
        <a className="skip-link" href="#auth-main">{t("common.skipToContent")}</a>
        <main id="auth-main" className="card auth-card">
          <LanguageToggle />
          <BrandLockup as="h1" subtitle />
          <p className="muted">
            {instanceInitialized ? t("auth.loginHint") : t("auth.initHint")}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (instanceInitialized) login();
              else initialize();
            }}
          >
            <div className="field">
              <label htmlFor="auth-email">{t("common.email")}</label>
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
                {instanceInitialized ? t("common.password") : t("auth.passwordNew")}
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
                  {t("auth.initialize")}
                </button>
              )}
              {instanceInitialized && (
                <button type="submit" className="btn">
                  {t("auth.signIn")}
                </button>
              )}
              {!instanceInitialized && (
                <button type="button" className="btn btn-ghost" onClick={() => login()}>
                  {t("auth.haveAccount")}
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
      <a className="skip-link" href="#app-main">{t("common.skipToContent")}</a>
      <header className="app-header">
        <BrandLockup as="h1" compact />
        <nav className="app-nav" aria-label={t("nav.primary")}>
          {(Object.keys(VIEW_META) as AppView[]).map((key) => (
            <button
              key={key}
              type="button"
              className="nav-btn"
              aria-current={view === key ? "page" : undefined}
              onClick={() => navigateToView(key)}
            >
              <NavIcon view={key} />
              <span>{t(VIEW_META[key].titleKey)}</span>
            </button>
          ))}
        </nav>
        <div className="header-meta">
          <LanguageToggle />
          <ThemeToggle />
          <span className="header-email" title={me.user.email}>{me.user.email}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => logout()}>
            {t("common.logout")}
          </button>
        </div>
      </header>

      <main id="app-main" className="app-main">
        <p className="sr-only live-status" aria-live="polite" aria-atomic="true">{pageStatus}</p>
        <h2 ref={viewTitleRef} tabIndex={-1} className="view-title" id="view-title">
          {viewTitle}
        </h2>
        {view === "overview" && (
          <>
            <section className="card hero-patrimonio" aria-labelledby="patrimonio-heading">
              <h2 className="label" id="patrimonio-heading">{t("overview.netWorth")}</h2>
              <p className="amount" aria-live="polite">
                {balancesLoading ? t("common.loading") : netWorthDisplay}
              </p>
              {balancesError && (
                <p className="alert" role="alert">{balancesError}</p>
              )}
              {balances && balances.balances.length > 0 && (
                <BalanceBreakdown rows={balances.balances} />
              )}
            </section>
            <OverviewCharts />
            <div className="quick-actions" role="navigation" aria-label={t("overview.quickActions")}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigateToView("movements")}>
                {t("overview.recordMovement")}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigateToView("import")}>
                {t("overview.importCsv")}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigateToView("reconciliation")}>
                {t("overview.reconcile")}
              </button>
            </div>
            <section className="card" aria-labelledby="cuentas-heading">
              <div className="toolbar">
                <h2 id="cuentas-heading" style={{ margin: 0, flex: 1 }}>{t("overview.accounts")}</h2>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadBalances()} disabled={balancesLoading}>
                  {t("common.update")}
                </button>
              </div>
              {!balancesLoading && balances && balances.balances.length === 0 && (
                <EmptyState title={t("overview.emptyTitle")} illustration="ledger">
                  {t("overview.emptyBody")}
                </EmptyState>
              )}
              {balances && balances.balances.length > 0 && (
                <div className="table-wrap">
                  <table className="data-table">
                    <caption className="sr-only">{t("overview.balancesCaption")}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t("common.code")}</th>
                        <th scope="col">{t("common.account")}</th>
                        <th scope="col">{t("common.type")}</th>
                        <th scope="col" className="amount-cell">{t("common.balance")}</th>
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
          <InvestmentsView
            balances={balances?.balances ?? null}
            balancesLoading={balancesLoading}
            onCreateHolding={() => navigateToView("movements")}
          />
        )}

        {view === "reconciliation" && (
            <section className="card" aria-labelledby="view-title">
            <p className="muted">{t("reconciliation.intro")}</p>
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
                {t("reconciliation.loadAccounts")}
              </button>
            </div>
            {accounts.length > 0 && (
              <>
              <div className="form-grid form-grid--2">
                <div className="field">
                  <label htmlFor="reconcile-from">{t("reconciliation.fromDate", { optional: t("common.optional") })}</label>
                  <input id="reconcile-from" type="date" value={reconcileFrom} onChange={(e) => setReconcileFrom(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="reconcile-to">{t("reconciliation.toDate", { optional: t("common.optional") })}</label>
                  <input id="reconcile-to" type="date" value={reconcileTo} onChange={(e) => setReconcileTo(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="reconcile-account">{t("common.account")}</label>
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
                {reconcileLoading ? t("common.loading") : t("reconciliation.loadUncleared")}
              </button>
            )}
            {uncleared.length === 0 && reconcileAccountId && !reconcileLoading && (
              <EmptyState illustration="reconcile" title={t("reconciliation.emptyTitle")}>
                {t("reconciliation.emptyBody")}
              </EmptyState>
            )}
            {uncleared.length > 0 && (
              <ul className="split-list" style={{ marginTop: "1rem" }}>
                {uncleared.map((row) => (
                  <li key={row.splitId} className="split-row">
                    <span>
                      <strong>{row.txnDate}</strong>
                      {" — "}
                      {row.description ?? t("common.noDescription")}
                      {" "}
                      <span className="muted">
                        {t("reconciliation.splitAmounts", {
                          debitLabel: t("reconciliation.debitAbbrev"),
                          creditLabel: t("reconciliation.creditAbbrev"),
                          debit: formatMinorDisplay(row.debitMinor, "MXN"),
                          credit: formatMinorDisplay(row.creditMinor, "MXN"),
                        })}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={reconcileRowBusy === row.splitId}
                      aria-busy={reconcileRowBusy === row.splitId}
                      aria-label={t("reconciliation.markReconciledAria", {
                        date: row.txnDate,
                        description: row.description ?? t("common.noDescription"),
                      })}
                      onClick={() => markReconciled(row.splitId)}
                    >
                      {reconcileRowBusy === row.splitId ? t("common.saving") : t("reconciliation.markReconciled")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
      <MobileNav view={view} onNavigate={navigateToView} />
    </div>
  );
}
