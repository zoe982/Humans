import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

export const load = async ({ locals }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");
  if (locals.user.role !== "admin") redirect(302, "/dashboard");
  return {};
};

export const actions = {
  sync: async ({ locals, cookies, request }: RequestEvent) => {
    if (locals.user == null) redirect(302, "/login");
    if (locals.user.role !== "admin") redirect(302, "/dashboard");

    const sessionToken = cookies.get("humans_session");
    const formData = await request.formData();
    const cursor = formData.get("cursor") as string | null;

    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(
      `${PUBLIC_API_URL}/api/admin/front/sync?${params.toString()}`,
      {
        method: "POST",
        headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
      },
    );

    if (!res.ok) {
      const raw: unknown = await res.json().catch(() => ({}));
      const errMsg = typeof raw === "object" && raw !== null && "error" in raw
        ? String((raw as { error: string }).error)
        : `Sync failed (HTTP ${String(res.status)})`;
      return { error: errMsg };
    }

    const json = (await res.json()) as { data: { total: number; imported: number; skipped: number; unmatched: number; errors: string[]; nextCursor: string | null } };
    return { result: json.data };
  },
};
