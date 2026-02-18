import { PUBLIC_API_URL } from "$env/static/public";

const API_BASE = PUBLIC_API_URL ?? "http://localhost:8787";

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function api<T>(
  path: string,
  options: FetchOptions = {},
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  const { params, ...init } = options;
  let url = `${API_BASE}${path}`;

  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const res = await fetchFn(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: "Request failed" }))) as {
      error?: string;
    };
    throw new Error(body.error ?? `HTTP ${String(res.status)}`);
  }

  return res.json() as Promise<T>;
}
