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

  const res = await fetch(`${PUBLIC_API_URL}/api/humans?page=${page}&limit=${limit}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) {
    console.error("[humans] Failed to load humans:", res.status);
    return { humans: [], page, limit, total: 0, userRole: locals.user?.role ?? "viewer" };
  }
  const raw: unknown = await res.json();
  const meta = isPaginatedData(raw) ? raw.meta : { page, limit, total: 0 };
  return { humans: isListData(raw) ? raw.data : [], page: meta.page, limit: meta.limit, total: meta.total, userRole: locals.user?.role ?? "viewer" };
};

export const actions = {
  delete: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const humanId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/humans/${humanId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete human");
    }

    return { success: true };
  },
};
