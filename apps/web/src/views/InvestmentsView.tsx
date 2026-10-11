import { useTranslation } from "react-i18next";
import { EmptyState } from "../components/EmptyState.js";
import { formatMinorDisplay } from "../lib/format.js";
import type { BalanceRow } from "../lib/types.js";

type Props = {
  balances: BalanceRow[] | null;
  balancesLoading?: boolean;
};

/** Activos de inversión modelados como cuentas ASSET; módulo de portafolio completo en evolución futura. */
export function InvestmentsView({ balances, balancesLoading }: Props) {
  const { t } = useTranslation();
  const assets = balances?.filter((b) => b.type === "ASSET" && b.includeInNetWorth) ?? [];

  return (
    <section className="card" aria-labelledby="view-title">
      <p className="muted">{t("investments.intro")}</p>
      {balancesLoading && <p className="muted" role="status">{t("common.loading")}</p>}
      {!balancesLoading && assets.length === 0 ? (
        <EmptyState illustration="chart" title={t("investments.emptyTitle")}>
          {t("investments.emptyBody")}
        </EmptyState>
      ) : (
        !balancesLoading &&
        assets.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">Posiciones de inversión por cuenta</caption>
              <thead>
                <tr>
                  <th scope="col">Cuenta</th>
                  <th scope="col" className="amount-cell">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.accountId}>
                    <td>{a.code} — {a.name}</td>
                    <td className="amount-cell">{formatMinorDisplay(a.balanceMinor, a.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </section>
  );
}
