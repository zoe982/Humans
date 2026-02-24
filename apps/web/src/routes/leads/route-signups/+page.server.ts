import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isListData, failFromApi } from "$lib/server/api";

function isPaginatedData(value: unknown): value is { meta: { page: number; limit: number; total: number } } {
  return typeof value === "object" && value !== null && "meta" in value && typeof (value as { meta: unknown }).meta === "object";
}

export const load = async ({ locals, cookies, url }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 25;
  const status = url.searchParams.get("status") || "";
  const q = url.searchParams.get("q") || "";
  const origin = url.searchParams.get("origin") || "";
  const destination = url.searchParams.get("destination") || "";
  const dateFrom = url.searchParams.get("dateFrom") || "";
  const dateTo = url.searchParams.get("dateTo") || "";

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  if (origin) params.set("origin", origin);
  if (destination) params.set("destination", destination);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const res = await fetch(`${PUBLIC_API_URL}/api/route-signups?${params.toString()}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) return { signups: [], page, limit, total: 0, userRole: locals.user?.role ?? "viewer", status, q, origin, destination, dateFrom, dateTo };
  const raw: unknown = await res.json();
  const meta = isPaginatedData(raw) ? raw.meta : { page, limit, total: 0 };
  return {
    signups: isListData(raw) ? raw.data : [],
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
    userRole: locals.user?.role ?? "viewer",
    status,
    q,
    origin,
    destination,
    dateFrom,
    dateTo,
  };
};

export const actions = {
  delete: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const signupId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/route-signups/${signupId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete route signup");
    }

    return { success: true };
  },
};
