import { useTranslation } from "react-i18next";
import { BalanceBreakdown } from "../components/BalanceBreakdown.js";
import { EmptyState } from "../components/EmptyState.js";
import { OverviewCharts } from "../components/OverviewCharts.js";
import { Skeleton } from "../components/Skeleton.js";
import { StatCard } from "../components/StatCard.js";
import { accountTypeLabel, formatMinorDisplay } from "../lib/format.js";
import { sumAbsMinorByType } from "../lib/balance-summary.js";
import type { AppView, BalanceRow } from "../lib/types.js";
import type { ActivityInitialFilters } from "./ActivityView.js";

type BalancesResponse = {
  balances: BalanceRow[];
  netWorth: string;
  netWorthMinor: string;
};

type Props = {
  balances: BalancesResponse | null;
  balancesLoading: boolean;
  balancesError: string | null;
  onRefresh: () => void;
  onNavigate: (view: AppView) => void;
  onOpenActivity: (filters?: ActivityInitialFilters) => void;
};

export function OverviewDashboard({
  balances,
  balancesLoading,
  balancesError,
  onRefresh,
  onNavigate,
  onOpenActivity,
}: Props) {
  const { t } = useTranslation();

  const netWorthDisplay =
    balances?.netWorthMinor != null
      ? formatMinorDisplay(balances.netWorthMinor, "MXN")
      : balances?.netWorth ?? "—";

  const rows = balances?.balances ?? [];
  const assetsMinor = sumAbsMinorByType(rows, "ASSET");
  const liabilitiesMinor = sumAbsMinorByType(rows, "LIABILITY");
  const accountCount = rows.length;

  return (
    <div className="dashboard dashboard-stagger">
      <section className="dashboard-hero card hero-patrimonio" aria-labelledby="patrimonio-heading">
        <div className="dashboard-hero-inner">
          <p className="label" id="patrimonio-heading">{t("overview.netWorth")}</p>
          {balancesLoading && !balances ? (
            <Skeleton lines={2} className="dashboard-hero-skeleton" />
          ) : (
            <p className="amount" aria-live="polite">{netWorthDisplay}</p>
          )}
          {balancesError && (
            <p className="alert" role="alert">{balancesError}</p>
          )}
          {balances && balances.balances.length > 0 && (
            <BalanceBreakdown rows={balances.balances} />
          )}
        </div>
      </section>

      <div className="kpi-grid dashboard-kpis" aria-busy={balancesLoading}>
        <StatCard
          id="kpi-assets"
          label={t("breakdown.assets")}
          value={balancesLoading ? "…" : formatMinorDisplay(assetsMinor.toString(), "MXN")}
        />
        <StatCard
          id="kpi-liabilities"
          label={t("breakdown.liabilities")}
          value={balancesLoading ? "…" : formatMinorDisplay(liabilitiesMinor.toString(), "MXN")}
        />
        <StatCard
          id="kpi-accounts"
          label={t("overview.accounts")}
          value={balancesLoading ? "…" : String(accountCount)}
          hint={accountCount > 0 ? t("overview.accountsHint") : undefined}
        />
      </div>

      <OverviewCharts
        onExploreCategory={({ accountId, fromDate, toDate }) =>
          onOpenActivity({ accountId, fromDate, toDate })
        }
      />

      <nav className="quick-actions dashboard-actions" aria-label={t("overview.quickActions")}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenActivity()}>
          {t("overview.exploreActivity")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate("movements")}>
          {t("overview.recordMovement")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate("import")}>
          {t("overview.importCsv")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate("reconciliation")}>
          {t("overview.reconcile")}
        </button>
      </nav>

      <section className="card dashboard-accounts" aria-labelledby="cuentas-heading">
        <div className="toolbar">
          <h2 id="cuentas-heading" className="dashboard-section-title">{t("overview.accounts")}</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onRefresh()}
            disabled={balancesLoading}
            aria-busy={balancesLoading}
          >
            {t("common.update")}
          </button>
        </div>
        {!balancesLoading && balances && balances.balances.length === 0 && (
          <EmptyState title={t("overview.emptyTitle")} illustration="ledger">
            {t("overview.emptyBody")}
          </EmptyState>
        )}
        {balancesLoading && !balances && <Skeleton lines={5} />}
        {balances && balances.balances.length > 0 && (
          <div className="table-wrap">
            <table className="data-table data-table--comfortable">
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
                    <td><span className="mono-chip">{row.code}</span></td>
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
    </div>
  );
}
