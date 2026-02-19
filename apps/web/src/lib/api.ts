import { PUBLIC_API_URL } from "$env/static/public";

const API_BASE = PUBLIC_API_URL !== "" ? PUBLIC_API_URL : "http://localhost:8787";

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

function isErrorBody(value: unknown): value is { error?: string } {
  return typeof value === "object" && value !== null;
}

export async function api(
  path: string,
  options: FetchOptions = {},
  fetchFn: typeof fetch = fetch,
): Promise<unknown> {
  const { params, ...init } = options;
  let url = `${API_BASE}${path}`;

  if (params != null) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const initHeaders = init.headers;
  const extraHeaders: Record<string, string> =
    initHeaders == null
      ? {}
      : Array.isArray(initHeaders)
        ? Object.fromEntries(initHeaders)
        : initHeaders instanceof Headers
          ? Object.fromEntries(initHeaders.entries())
          : initHeaders;

  const res = await fetchFn(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });

  if (!res.ok) {
    const raw: unknown = await res.json().catch(() => ({ error: "Request failed" }));
    const body = isErrorBody(raw) ? raw : { error: "Request failed" };
    throw new Error(body.error ?? `HTTP ${String(res.status)}`);
  }

  return res.json();
}
