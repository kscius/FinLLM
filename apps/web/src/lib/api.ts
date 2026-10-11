/** Empty = same origin (Traefik: web + /api on one host). Dev: set VITE_API_URL in .env */
const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data as T;
}
