import { PUBLIC_API_URL } from "$env/static/public";

const API_BASE = PUBLIC_API_URL !== "" ? PUBLIC_API_URL : "http://localhost:8787";

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

function isErrorBody(value: unknown): value is { error?: string; code?: string; requestId?: string; details?: Record<string, string[]> } {
  return typeof value === "object" && value !== null;
}

/** Structured API error with code and request ID for traceability. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string | undefined,
    public readonly requestId: string | undefined,
    public readonly details: Record<string, string[]> | undefined,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** Extract a human-readable error message from an API error response body. */
export function extractApiError(resBody: unknown, fallback: string): string {
  const body = isErrorBody(resBody) ? resBody : {};
  const msg = body.error ?? fallback;
  if (body.details != null) {
    const fieldErrors = Object.entries(body.details)
      .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
      .join("; ");
    if (fieldErrors.length > 0) return `${msg} — ${fieldErrors}`;
  }
  return msg;
}

/** Extract structured error info from an API error response body. */
export function extractApiErrorInfo(resBody: unknown, fallback: string): { message: string; code?: string; requestId?: string; details?: Record<string, string[]> } {
  const body = isErrorBody(resBody) ? resBody : {};
  const message = extractApiError(resBody, fallback);
  return {
    message,
    code: body.code,
    requestId: body.requestId,
    details: body.details,
  };
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
    const info = extractApiErrorInfo(raw, `HTTP ${String(res.status)}`);
    throw new ApiRequestError(info.message, info.code, info.requestId, info.details, res.status);
  }

  return res.json();
}
