import { useTranslation } from "react-i18next";
import { sumAbsMinorByType } from "../lib/balance-summary.js";
import { formatMinorDisplay } from "../lib/format.js";
import type { BalanceRow } from "../lib/types.js";

type Props = {
  rows: BalanceRow[];
};

export function BalanceBreakdown({ rows }: Props) {
  const { t } = useTranslation();
  const assets = sumAbsMinorByType(rows, "ASSET");
  const liabilities = sumAbsMinorByType(rows, "LIABILITY");
  const total = assets + liabilities;
  if (total === 0n) return null;

  const assetPct = Number((assets * 10000n) / total) / 100;
  const liabPct = 100 - assetPct;

  return (
    <section className="breakdown" aria-labelledby="breakdown-heading">
      <h3 id="breakdown-heading" className="breakdown-title">{t("breakdown.title")}</h3>
      <div
        className="breakdown-bar"
        role="img"
        aria-label={`${t("breakdown.assets")} ${assetPct.toFixed(0)}%, ${t("breakdown.liabilities")} ${liabPct.toFixed(0)}%`}
      >
        <span className="breakdown-seg breakdown-seg--asset" style={{ width: `${assetPct}%` }} />
        <span className="breakdown-seg breakdown-seg--liability" style={{ width: `${liabPct}%` }} />
      </div>
      <ul className="breakdown-legend">
        <li>
          <span className="breakdown-dot breakdown-dot--asset" aria-hidden="true" />
          {t("breakdown.assets")} — {formatMinorDisplay(assets.toString(), "MXN")}
        </li>
        <li>
          <span className="breakdown-dot breakdown-dot--liability" aria-hidden="true" />
          {t("breakdown.liabilities")} — {formatMinorDisplay(liabilities.toString(), "MXN")}
        </li>
      </ul>
    </section>
  );
}
