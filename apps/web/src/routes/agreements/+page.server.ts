import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isPaginatedData(value: unknown): value is { data: unknown[]; meta: { page: number; limit: number; total: number } } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export const load = async ({ locals, cookies, url }: RequestEvent): Promise<{ agreements: unknown[]; meta: { page: number; limit: number; total: number } }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const page = url.searchParams.get("page") ?? "1";
  const limit = url.searchParams.get("limit") ?? "50";

  const res = await fetch(`${PUBLIC_API_URL}/api/agreements?page=${page}&limit=${limit}`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });

  if (!res.ok) return { agreements: [], meta: { page: 1, limit: 50, total: 0 } };
  const raw: unknown = await res.json();
  if (isPaginatedData(raw)) {
    return { agreements: raw.data, meta: raw.meta };
  }
  return { agreements: [], meta: { page: 1, limit: 50, total: 0 } };
};
