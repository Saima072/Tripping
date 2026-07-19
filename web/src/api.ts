import type { User } from "./types";

// Access token lives in memory only (never localStorage — XSS can't exfiltrate
// what isn't persisted). The refresh token is an httpOnly cookie scoped to
// /api/auth, sent automatically on refresh/logout.
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)ts_csrf=([^;]+)/);
  return match?.[1] ?? "";
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function rawRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(path, { ...init, headers });
}

export async function tryRefresh(): Promise<User | null> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken() },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { accessToken: string; user: User };
  accessToken = data.accessToken;
  return data.user;
}

/** Fetch wrapper: on 401, attempts one silent token refresh then retries. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await rawRequest(path, init);
  if (res.status === 401 && accessToken) {
    const refreshed = await tryRefresh();
    if (refreshed) res = await rawRequest(path, init);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function logoutRequest(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken() },
  });
  accessToken = null;
}
