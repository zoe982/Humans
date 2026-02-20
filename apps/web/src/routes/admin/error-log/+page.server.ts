import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export const load = async ({ locals, cookies, url }: RequestEvent): Promise<{ errors: unknown[]; offset: number; limit: number; codeFilter: string; dateFrom: string; dateTo: string; resolutionStatus: string }> => {
  if (locals.user == null) redirect(302, "/login");
  if (locals.user.role !== "admin") redirect(302, "/dashboard");

  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = 50;
  const codeFilter = url.searchParams.get("code") ?? "";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";
  const resolutionStatus = url.searchParams.get("resolutionStatus") ?? "";
  const sessionToken = cookies.get("humans_session");

  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (codeFilter) params.set("code", codeFilter);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  if (resolutionStatus) params.set("resolutionStatus", resolutionStatus);

  const res = await fetch(
    `${PUBLIC_API_URL}/api/admin/error-log?${params.toString()}`,
    { headers: { Cookie: `humans_session=${sessionToken ?? ""}` } },
  );

  if (!res.ok) {
    console.error("[error-log] Failed to load error log:", res.status);
    return { errors: [], offset, limit, codeFilter, dateFrom, dateTo, resolutionStatus };
  }

  const raw: unknown = await res.json();
  return { errors: isListData(raw) ? raw.data : [], offset, limit, codeFilter, dateFrom, dateTo, resolutionStatus };
};

export const actions = {
  toggleResolution: async ({ request, locals, cookies }: RequestEvent) => {
    if (locals.user == null) redirect(302, "/login");
    if (locals.user.role !== "admin") redirect(302, "/dashboard");

    const form = await request.formData();
    const id = form.get("id") as string;
    const resolutionStatus = form.get("resolutionStatus") as string;
    const sessionToken = cookies.get("humans_session");

    await fetch(`${PUBLIC_API_URL}/api/admin/error-log/${id}/resolution`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ resolutionStatus }),
    });

    return { success: true };
  },
};
