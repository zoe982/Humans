import { redirect } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isListData, failFromApi } from "$lib/server/api";

function formStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function isPaginatedData(value: unknown): value is { meta: { page: number; limit: number; total: number } } {
  return typeof value === "object" && value !== null && "meta" in value && typeof (value as { meta: unknown }).meta === "object";
}

export const load = async ({ locals, cookies, url }: RequestEvent): Promise<{
  signups: unknown[];
  page: number;
  limit: number;
  total: number;
  userRole: string;
  status: string;
  q: string;
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const pageRaw = Number(url.searchParams.get("page"));
  const page = pageRaw !== 0 ? pageRaw : 1;
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = limitRaw !== 0 ? limitRaw : 25;
  const status = url.searchParams.get("status") ?? "";
  const q = url.searchParams.get("q") ?? "";
  const origin = url.searchParams.get("origin") ?? "";
  const destination = url.searchParams.get("destination") ?? "";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status !== "") params.set("status", status);
  if (q !== "") params.set("q", q);
  if (origin !== "") params.set("origin", origin);
  if (destination !== "") params.set("destination", destination);
  if (dateFrom !== "") params.set("dateFrom", dateFrom);
  if (dateTo !== "") params.set("dateTo", dateTo);

  const res = await fetch(`${PUBLIC_API_URL}/api/route-signups?${params.toString()}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) return { signups: [], page, limit, total: 0, userRole: locals.user.role, status, q, origin, destination, dateFrom, dateTo };
  const raw: unknown = await res.json();
  const meta = isPaginatedData(raw) ? raw.meta : { page, limit, total: 0 };
  return {
    signups: isListData(raw) ? raw.data : [],
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
    userRole: locals.user.role,
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
    const signupId = formStr(form.get("id"));

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
