import { redirect } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isListData, failFromApi } from "$lib/server/api";

function isPaginatedData(value: unknown): value is { meta: { page: number; limit: number; total: number } } {
  return typeof value === "object" && value !== null && "meta" in value && typeof (value as { meta: unknown }).meta === "object";
}

function getFormString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

export const load = async ({ locals, cookies, url }: RequestEvent): Promise<{ humans: unknown[]; page: number; limit: number; total: number; q: string; userRole: string }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const pageRaw = Number(url.searchParams.get("page"));
  const limitRaw = Number(url.searchParams.get("limit"));
  const page = pageRaw !== 0 ? pageRaw : 1;
  const limit = limitRaw !== 0 ? limitRaw : 25;
  const q = url.searchParams.get("q") ?? "";

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (q !== "") params.set("q", q);

  const res = await fetch(`${PUBLIC_API_URL}/api/humans?${params.toString()}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) {
    console.error("[humans] Failed to load humans:", res.status);
    return { humans: [], page, limit, total: 0, q, userRole: locals.user.role };
  }
  const raw: unknown = await res.json();
  const meta = isPaginatedData(raw) ? raw.meta : { page, limit, total: 0 };
  return { humans: isListData(raw) ? raw.data : [], page: meta.page, limit: meta.limit, total: meta.total, q, userRole: locals.user.role };
};

export const actions = {
  delete: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const humanId = getFormString(form, "id");

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
