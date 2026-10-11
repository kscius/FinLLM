import { useEffect, useState } from "react";

/** Empty = same origin (Traefik: web + /api on one host). Dev: set VITE_API_URL in .env */
const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

export function App() {
  const [me, setMe] = useState<{ user?: { email: string }; book?: { id: string } } | null>(null);
  const [balances, setBalances] = useState<object | null>(null);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [reconcileAccountId, setReconcileAccountId] = useState("");
  const [uncleared, setUncleared] = useState<Array<{ splitId: string; txnDate: string; description: string | null; debitMinor: string; creditMinor: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [instanceInitialized, setInstanceInitialized] = useState<boolean | null>(null);

  useEffect(() => {
    api("/api/v1/setup/status")
      .then((data: { initialized?: boolean }) => setInstanceInitialized(Boolean(data.initialized)))
      .catch(() => setInstanceInitialized(null));
    api("/api/v1/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  async function initialize() {
    setError(null);
    try {
      await api("/api/v1/setup/initialize", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName: "Owner" }),
      });
      setMe(await api("/api/v1/me"));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Setup failed";
      if (message === "Instance already initialized") {
        setInstanceInitialized(true);
        setError("This instance is already set up. Use Sign in with your owner email and password.");
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
      setMe(await api("/api/v1/me"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }

  async function loadBalances() {
    setBalances(await api("/api/v1/balances"));
  }

  async function loadAccounts() {
    const data = await api("/api/v1/accounts");
    const list = (data.accounts as Array<{ id: string; name: string; code: string; type: string }>).filter(
      (a) => a.type === "ASSET" || a.type === "LIABILITY",
    );
    setAccounts(list);
    if (!reconcileAccountId && list[0]) setReconcileAccountId(list[0].id);
  }

  async function loadUncleared() {
    if (!reconcileAccountId) return;
    const data = await api(
      `/api/v1/transactions?accountId=${reconcileAccountId}&reconcileState=UNCLEARED&limit=100`,
    );
    setUncleared(
      (data.items as Array<{
        splitId: string;
        txnDate: string;
        description: string | null;
        debitMinor: string;
        creditMinor: string;
      }>) ?? [],
    );
  }

  async function markReconciled(splitId: string) {
    await api(`/api/v1/splits/${splitId}/reconcile`, {
      method: "PATCH",
      body: JSON.stringify({ state: "RECONCILED" }),
    });
    await loadUncleared();
  }

  if (!me?.user) {
    return (
      <main>
        <h1>FinLLM</h1>
        <p className="card">
          {instanceInitialized
            ? "Instance is ready. Sign in with the email and password you used during setup."
            : "Self-hosted personal finance. Create the first owner account to initialize this instance."}
        </p>
        <div className="card">
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
          <label>{instanceInitialized ? "Password" : "Password (min 12)"}</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={instanceInitialized ? "current-password" : "new-password"}
          />
          {!instanceInitialized && (
            <button type="button" onClick={initialize} style={{ marginRight: 8 }}>
              Initialize instance
            </button>
          )}
          <button type="button" onClick={login}>
            Sign in
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main>
      <h1>FinLLM Dashboard</h1>
      <p className="card">Signed in as {me.user.email}</p>
      <div className="card">
        <button type="button" onClick={loadBalances}>Refresh balances</button>
        {balances && (
          <pre style={{ overflow: "auto", fontSize: 12 }}>{JSON.stringify(balances, null, 2)}</pre>
        )}
      </div>
      <div className="card">
        <h2>Reconciliation</h2>
        <button type="button" onClick={loadAccounts}>Load accounts</button>
        {accounts.length > 0 && (
          <>
            <label htmlFor="reconcile-account">Account</label>
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
            <button type="button" onClick={loadUncleared} style={{ marginTop: 8 }}>
              Show uncleared splits
            </button>
          </>
        )}
        {uncleared.length === 0 ? (
          <p>No uncleared splits loaded.</p>
        ) : (
          <ul>
            {uncleared.map((row) => (
              <li key={row.splitId}>
                {row.txnDate} — {row.description ?? "—"} (D {row.debitMinor} / C {row.creditMinor})
                <button type="button" onClick={() => markReconciled(row.splitId)} style={{ marginLeft: 8 }}>
                  Mark reconciled
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
