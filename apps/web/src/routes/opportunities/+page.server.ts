import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiErrorInfo } from "$lib/api";

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

function isPaginatedData(value: unknown): value is { meta: { page: number; limit: number; total: number } } {
  return typeof value === "object" && value !== null && "meta" in value && typeof (value as { meta: unknown }).meta === "object";
}

function failFromApi(resBody: unknown, status: number, fallback: string): ActionFailure<{ error: string; code?: string; requestId?: string }> {
  const info = extractApiErrorInfo(resBody, fallback);
  return fail(status, { error: info.message, code: info.code, requestId: info.requestId });
}

export const load = async ({ locals, cookies, url }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 25;
  const q = url.searchParams.get("q") ?? "";
  const stage = url.searchParams.get("stage") ?? "";
  const ownerId = url.searchParams.get("ownerId") ?? "";
  const overdueOnly = url.searchParams.get("overdueOnly") === "true";

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (q) params.set("q", q);
  if (stage) params.set("stage", stage);
  if (ownerId) params.set("ownerId", ownerId);
  if (overdueOnly) params.set("overdueOnly", "true");

  const headers = { Cookie: `humans_session=${sessionToken ?? ""}` };

  const [res, colleaguesRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/opportunities?${params.toString()}`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/colleagues`, { headers }),
  ]);

  let opportunities: unknown[] = [];
  let meta = { page, limit, total: 0 };
  if (res.ok) {
    const raw: unknown = await res.json();
    opportunities = isListData(raw) ? raw.data : [];
    if (isPaginatedData(raw)) meta = raw.meta;
  }

  let colleagues: unknown[] = [];
  if (colleaguesRes.ok) {
    const raw: unknown = await colleaguesRes.json();
    colleagues = isListData(raw) ? raw.data : [];
  }

  return {
    opportunities,
    colleagues,
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
    q,
    stage,
    ownerId,
    overdueOnly,
    userRole: locals.user?.role ?? "viewer",
  };
};

export const actions = {
  delete: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete opportunity");
    }

    return { success: true };
  },
};
