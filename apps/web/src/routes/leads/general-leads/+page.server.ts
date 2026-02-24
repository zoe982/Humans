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
  leads: unknown[];
  page: number;
  limit: number;
  total: number;
  userRole: string;
  status: string;
  source: string;
  q: string;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const pageRaw = Number(url.searchParams.get("page"));
  const page = pageRaw !== 0 ? pageRaw : 1;
  const limitRaw = Number(url.searchParams.get("limit"));
  const limit = limitRaw !== 0 ? limitRaw : 25;
  const status = url.searchParams.get("status") ?? "";
  const source = url.searchParams.get("source") ?? "";
  const q = url.searchParams.get("q") ?? "";

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status !== "") params.set("status", status);
  if (source !== "") params.set("source", source);
  if (q !== "") params.set("q", q);

  const res = await fetch(`${PUBLIC_API_URL}/api/general-leads?${params.toString()}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) return { leads: [], page, limit, total: 0, userRole: locals.user.role, status, source, q };
  const raw: unknown = await res.json();
  const meta = isPaginatedData(raw) ? raw.meta : { page, limit, total: 0 };
  return {
    leads: isListData(raw) ? raw.data : [],
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
    userRole: locals.user.role,
    status,
    source,
    q,
  };
};

export const actions = {
  delete: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const leadId = formStr(form.get("id"));

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${leadId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete general lead");
    }

    return { success: true };
  },
};
