import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMinorDisplay } from "../lib/format.js";
import { allocationShare } from "../lib/investments.js";
import type { BalanceRow } from "../lib/types.js";

const SLICE_COLORS = [
  "var(--accent)",
  "color-mix(in srgb, var(--accent) 70%, var(--ink))",
  "color-mix(in srgb, var(--accent) 45%, var(--paper))",
  "#0e7490",
  "#0369a1",
  "#4d7c0f",
  "#b45309",
];

type Props = {
  positions: BalanceRow[];
};

export function InvestmentAllocationChart({ positions }: Props) {
  const { t } = useTranslation();
  const totalAbs = useMemo(
    () =>
      positions.reduce((n, r) => {
        try {
          const v = BigInt(r.balanceMinor);
          return n + (v < 0n ? -v : v);
        } catch {
          return n;
        }
      }, 0n),
    [positions],
  );

  const data = useMemo(
    () =>
      positions.map((p) => ({
        name: p.code,
        fullName: `${p.code} — ${p.name}`,
        value: allocationShare(p, totalAbs),
        balanceLabel: formatMinorDisplay(p.balanceMinor, p.currencyCode),
      })),
    [positions, totalAbs],
  );

  if (positions.length < 2 || totalAbs === 0n) return null;

  return (
    <section className="card chart-panel allocation-panel" aria-labelledby="allocation-heading">
      <h3 id="allocation-heading" className="chart-heading">{t("investments.allocationTitle")}</h3>
      <div className="allocation-layout">
        <div className="chart-wrap allocation-chart">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
                stroke="var(--paper-elevated)"
                strokeWidth={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, _n, item) => [
                  `${v.toFixed(1)}% · ${item.payload.balanceLabel}`,
                  item.payload.fullName,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="allocation-legend">
          {data.map((d, i) => (
            <li key={d.name}>
              <span
                className="allocation-swatch"
                style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                aria-hidden="true"
              />
              <span className="allocation-legend-text">
                <span className="allocation-legend-name">{d.fullName}</span>
                <span className="allocation-legend-meta muted">
                  {d.value.toFixed(1)}% · {d.balanceLabel}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
