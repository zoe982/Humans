import { browser } from "$app/environment";
import { PUBLIC_API_URL } from "$env/static/public";

export function isListResponse(
  value: unknown,
): value is { data: unknown[]; total?: number; meta?: { page: number; limit: number; total: number } } {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  );
}

export async function fetchEntityList(
  svelteKitFetch: typeof fetch,
  path: string,
  sessionToken: string | null,
): Promise<unknown[]> {
  const url = `${PUBLIC_API_URL}${path}`;
  const headers: Record<string, string> = {};

  if (!browser && sessionToken) {
    headers["Cookie"] = `humans_session=${sessionToken}`;
  }

  const res = await svelteKitFetch(url, {
    ...(browser ? { credentials: "include" as const } : {}),
    headers,
  });

  if (!res.ok) return [];

  const raw: unknown = await res.json();
  return isListResponse(raw) ? raw.data : [];
}
