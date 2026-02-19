import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isLogData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export const load = async ({ locals, cookies, url }: RequestEvent): Promise<{ logs: unknown[]; offset: number; limit: number }> => {
  if (locals.user == null) redirect(302, "/login");
  if (locals.user.role !== "admin") redirect(302, "/dashboard");

  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = 50;
  const sessionToken = cookies.get("humans_session");

  const res = await fetch(
    `${PUBLIC_API_URL}/api/admin/audit-log?limit=${String(limit)}&offset=${String(offset)}`,
    { headers: { Cookie: `humans_session=${sessionToken ?? ""}` } },
  );

  if (!res.ok) return { logs: [], offset, limit };
  const raw: unknown = await res.json();
  return { logs: isLogData(raw) ? raw.data : [], offset, limit };
};
