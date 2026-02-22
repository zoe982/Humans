import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

function isPaginatedData(value: unknown): value is { meta: { page: number; limit: number; total: number } } {
  return typeof value === "object" && value !== null && "meta" in value && typeof (value as { meta: unknown }).meta === "object";
}

export const load = async ({ locals, cookies, url }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 25;

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  const res = await fetch(`${PUBLIC_API_URL}/api/flights?${params.toString()}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  let flights: unknown[] = [];
  let meta = { page, limit, total: 0 };
  if (res.ok) {
    const raw: unknown = await res.json();
    flights = isListData(raw) ? raw.data : [];
    if (isPaginatedData(raw)) meta = raw.meta;
  }

  return {
    flights,
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
    userRole: locals.user?.role ?? "viewer",
  };
};
