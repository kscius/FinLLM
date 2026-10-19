import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api.js";
import { formatMinorDisplay } from "../lib/format.js";
import { defaultPeriodLast30Days } from "../lib/transaction-rows.js";

type NetWorthPoint = { date: string; netWorthMinor: string };
type ExpenseRow = { accountId: string; code: string; name: string; totalMinor: string };

type Props = {
  onExploreCategory?: (params: { accountId: string; fromDate: string; toDate: string }) => void;
};

function minorToDisplay(minor: string): number {
  try {
    return Number(BigInt(minor)) / 100;
  } catch {
    return 0;
  }
}

export function OverviewCharts({ onExploreCategory }: Props) {
  const { t } = useTranslation();
  const defaultPeriod = defaultPeriodLast30Days();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [expFromDate, setExpFromDate] = useState(defaultPeriod.fromDate);
  const [expToDate, setExpToDate] = useState(defaultPeriod.toDate);
  const [netSeries, setNetSeries] = useState<NetWorthPoint[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const expQuery = new URLSearchParams({ fromDate: expFromDate, toDate: expToDate });
        const [nw, exp] = await Promise.all([
          api<{ points: NetWorthPoint[] }>("/api/v1/analytics/net-worth-series"),
          api<{ categories: ExpenseRow[] }>(`/api/v1/analytics/expenses-by-category?${expQuery}`),
        ]);
        if (!cancelled) {
          setNetSeries(nw.points ?? []);
          setExpenses(exp.categories ?? []);
        }
      } catch {
        if (!cancelled) {
          setNetSeries([]);
          setExpenses([]);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, expFromDate, expToDate]);

  const lineData = useMemo(
    () =>
      netSeries.map((p) => ({
        date: p.date,
        value: minorToDisplay(p.netWorthMinor),
        label: formatMinorDisplay(p.netWorthMinor, "MXN"),
      })),
    [netSeries],
  );

  const barData = useMemo(
    () =>
      expenses.slice(0, 12).map((c) => ({
        accountId: c.accountId,
        name: c.code,
        fullName: `${c.code} — ${c.name}`,
        value: minorToDisplay(c.totalMinor),
        label: formatMinorDisplay(c.totalMinor, "MXN"),
      })),
    [expenses],
  );

  if (loading) {
    return <p className="muted chart-panel" role="status">{t("overview.chartLoading")}</p>;
  }

  if (loadError) {
    return (
      <div className="card chart-panel chart-error" role="alert">
        <p className="muted">{t("overview.chartError")}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReloadKey((k) => k + 1)}>
          {t("overview.chartRetry")}
        </button>
      </div>
    );
  }

  if (lineData.length === 0 && barData.length === 0) {
    return <p className="muted chart-panel" role="status">{t("overview.chartEmpty")}</p>;
  }

  return (
    <div className="charts-grid">
      {lineData.length > 0 && (
        <section className="card chart-panel" aria-labelledby="chart-nw-heading">
          <h3 id="chart-nw-heading" className="chart-heading">{t("overview.chartNetWorth")}</h3>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                <Tooltip formatter={(v: number) => formatMinorDisplay(String(Math.round(v * 100)), "MXN")} />
                <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
      {barData.length > 0 && (
        <section className="card chart-panel" aria-labelledby="chart-exp-heading">
          <h3 id="chart-exp-heading" className="chart-heading">{t("overview.chartExpenses")}</h3>
          <div className="form-grid form-grid--2" style={{ marginBottom: "0.75rem" }}>
            <div className="field">
              <label htmlFor="chart-exp-from">{t("overview.chartFrom")}</label>
              <input
                id="chart-exp-from"
                type="date"
                value={expFromDate}
                onChange={(e) => setExpFromDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="chart-exp-to">{t("overview.chartTo")}</label>
              <input
                id="chart-exp-to"
                type="date"
                value={expToDate}
                onChange={(e) => setExpToDate(e.target.value)}
              />
            </div>
          </div>
          {onExploreCategory && (
            <p className="field-hint">{t("overview.chartDrillHint")}</p>
          )}
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                  formatter={(v: number) => formatMinorDisplay(String(Math.round(v * 100)), "MXN")}
                />
                <Bar
                  dataKey="value"
                  fill="var(--accent)"
                  radius={[4, 4, 0, 0]}
                  cursor={onExploreCategory ? "pointer" : undefined}
                  onClick={(data) => {
                    const row = data?.payload as { accountId?: string } | undefined;
                    if (row?.accountId && onExploreCategory) {
                      onExploreCategory({
                        accountId: row.accountId,
                        fromDate: expFromDate,
                        toDate: expToDate,
                      });
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
