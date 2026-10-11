import { useTranslation } from "react-i18next";
import { formatMinorDisplay } from "../lib/format.js";
import type { BalanceRow } from "../lib/types.js";

type Props = {
  rows: BalanceRow[];
};

function sumAbsMinor(rows: BalanceRow[], type: string): bigint {
  let n = 0n;
  for (const r of rows) {
    if (r.type !== type) continue;
    try {
      const v = BigInt(r.balanceMinor);
      n += v < 0n ? -v : v;
    } catch {
      /* skip */
    }
  }
  return n;
}

export function BalanceBreakdown({ rows }: Props) {
  const { t } = useTranslation();
  const assets = sumAbsMinor(rows, "ASSET");
  const liabilities = sumAbsMinor(rows, "LIABILITY");
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
