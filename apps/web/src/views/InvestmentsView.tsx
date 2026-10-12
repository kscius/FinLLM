import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../components/EmptyState.js";
import { InvestmentAllocationChart } from "../components/InvestmentAllocationChart.js";
import { Skeleton } from "../components/Skeleton.js";
import { StatCard } from "../components/StatCard.js";
import { accountSubtypeLabel, formatMinorDisplay } from "../lib/format.js";
import {
  allocationShare,
  assetBalances,
  filterBySegment,
  sumAbsMinor,
  type PortfolioSegment,
} from "../lib/investments.js";
import type { BalanceRow } from "../lib/types.js";

type Props = {
  balances: BalanceRow[] | null;
  balancesLoading?: boolean;
  onCreateHolding?: () => void;
};

export function InvestmentsView({ balances, balancesLoading, onCreateHolding }: Props) {
  const { t } = useTranslation();
  const [segment, setSegment] = useState<PortfolioSegment>("holdings");

  const allAssets = useMemo(() => assetBalances(balances), [balances]);
  const positions = useMemo(() => filterBySegment(balances, segment), [balances, segment]);
  const totalAbs = useMemo(() => sumAbsMinor(positions), [positions]);

  const largest = useMemo(() => {
    if (positions.length === 0) return null;
    return positions.reduce((best, row) => {
      try {
        const v = BigInt(row.balanceMinor);
        const abs = v < 0n ? -v : v;
        const bestV = BigInt(best.balanceMinor);
        const bestAbs = bestV < 0n ? -bestV : bestV;
        return abs > bestAbs ? row : best;
      } catch {
        return best;
      }
    });
  }, [positions]);

  const totalDisplay =
    totalAbs > 0n ? formatMinorDisplay(totalAbs.toString(), positions[0]?.currencyCode ?? "MXN") : "—";

  const segmentButtons: { id: PortfolioSegment; label: string }[] = [
    { id: "holdings", label: t("investments.segmentHoldings") },
    { id: "cash", label: t("investments.segmentCash") },
    { id: "all", label: t("investments.segmentAll") },
  ];

  return (
    <div className="investments-stack">
      <section className="card investments-hero" aria-labelledby="investments-hero-heading">
        <div className="investments-hero-copy">
          <h3 id="investments-hero-heading" className="investments-hero-title">
            {t("investments.heroTitle")}
          </h3>
          <p className="muted investments-intro">{t("investments.intro")}</p>
        </div>
        <div role="group" aria-label={t("investments.segmentLabel")} className="segmented investments-segmented">
          {segmentButtons.map((s) => (
            <button
              key={s.id}
              type="button"
              className="segmented-btn"
              aria-pressed={segment === s.id}
              onClick={() => setSegment(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {balancesLoading && (
        <section className="card" aria-busy="true" aria-label={t("common.loading")}>
          <Skeleton lines={4} />
        </section>
      )}

      {!balancesLoading && allAssets.length === 0 && (
        <section className="card" aria-labelledby="view-title">
          <EmptyState illustration="chart" title={t("investments.emptyTitle")}>
            <p>{t("investments.emptyBody")}</p>
            {onCreateHolding && (
              <button type="button" className="btn btn-sm empty-cta" onClick={onCreateHolding}>
                {t("investments.createHoldingCta")}
              </button>
            )}
          </EmptyState>
        </section>
      )}

      {!balancesLoading && allAssets.length > 0 && positions.length === 0 && (
        <section className="card" aria-labelledby="view-title">
          <EmptyState illustration="wallet" title={t("investments.segmentEmptyTitle")}>
            <p>
              {t("investments.segmentEmptyBody", {
                segment:
                  segment === "holdings"
                    ? t("investments.segmentHoldings")
                    : segment === "cash"
                      ? t("investments.segmentCash")
                      : t("investments.segmentAll"),
              })}
            </p>
            {segment === "holdings" && onCreateHolding && (
              <button type="button" className="btn btn-sm empty-cta" onClick={onCreateHolding}>
                {t("investments.createHoldingCta")}
              </button>
            )}
          </EmptyState>
        </section>
      )}

      {!balancesLoading && positions.length > 0 && (
        <>
          <div className="kpi-grid" role="group" aria-label={t("investments.kpiGroup")}>
            <StatCard
              id="inv-kpi-total"
              label={t("investments.totalValue")}
              value={totalDisplay}
              hint={t("investments.positionCount", { count: positions.length })}
            />
            <StatCard
              id="inv-kpi-largest"
              label={t("investments.largestHolding")}
              value={
                largest
                  ? formatMinorDisplay(largest.balanceMinor, largest.currencyCode)
                  : "—"
              }
              hint={largest ? `${largest.code} — ${largest.name}` : undefined}
            />
            <StatCard
              id="inv-kpi-top-share"
              label={t("investments.topAllocation")}
              value={
                largest && totalAbs > 0n
                  ? `${allocationShare(largest, totalAbs).toFixed(1)}%`
                  : "—"
              }
              hint={largest?.code}
            />
          </div>

          <InvestmentAllocationChart positions={positions} />

          <section className="card positions-panel" aria-labelledby="positions-heading">
            <h3 id="positions-heading" className="chart-heading">{t("investments.positionsTitle")}</h3>
            <ul className="position-cards">
              {positions.map((a) => (
                <li key={a.accountId} className="position-card">
                  <div className="position-card-head">
                    <span className="position-code">{a.code}</span>
                    {a.subtype && (
                      <span className="position-badge">{accountSubtypeLabel(a.subtype)}</span>
                    )}
                  </div>
                  <p className="position-name">{a.name}</p>
                  <p className="position-amount">{formatMinorDisplay(a.balanceMinor, a.currencyCode)}</p>
                  {totalAbs > 0n && (
                    <p className="position-share muted">
                      {allocationShare(a, totalAbs).toFixed(1)}% {t("investments.ofPortfolio")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="table-wrap positions-table-wrap">
              <table className="data-table">
                <caption className="sr-only">{t("investments.positionsCaption")}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("common.account")}</th>
                    <th scope="col">{t("investments.subtypeColumn")}</th>
                    <th scope="col" className="amount-cell">{t("common.balance")}</th>
                    <th scope="col" className="amount-cell">{t("investments.shareColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((a) => (
                    <tr key={a.accountId}>
                      <td>{a.code} — {a.name}</td>
                      <td>{a.subtype ? accountSubtypeLabel(a.subtype) : "—"}</td>
                      <td className="amount-cell">{formatMinorDisplay(a.balanceMinor, a.currencyCode)}</td>
                      <td className="amount-cell">
                        {totalAbs > 0n ? `${allocationShare(a, totalAbs).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="muted investments-footnote" role="note">{t("investments.footnote")}</p>
        </>
      )}
    </div>
  );
}
