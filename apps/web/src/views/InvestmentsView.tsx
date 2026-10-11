import { formatMinorDisplay } from "../lib/format.js";
import type { BalanceRow } from "../lib/types.js";

type Props = {
  balances: BalanceRow[] | null;
};

/** Activos de inversión modelados como cuentas ASSET; módulo de portafolio completo en evolución futura. */
export function InvestmentsView({ balances }: Props) {
  const assets = balances?.filter((b) => b.type === "ASSET" && b.includeInNetWorth) ?? [];

  return (
    <section className="card" aria-labelledby="inv-heading">
      <h2 id="inv-heading">Inversiones</h2>
      <p className="muted">
        Posiciones modeladas como cuentas de activo en el libro. Rendimiento, lotes e IRR no están en esta versión;
        usa el harness MCP para operaciones avanzadas.
      </p>
      {assets.length === 0 ? (
        <p className="muted">No hay cuentas de activo con saldo. Crea una cuenta ASSET en Movimientos.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cuenta</th>
                <th className="amount-cell">Saldo</th>
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
      )}
    </section>
  );
}
