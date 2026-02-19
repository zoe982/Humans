import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export const load = async ({ locals, cookies, url }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const type = url.searchParams.get("type") ?? "";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";

  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);

  const qs = params.toString();
  const res = await fetch(`${PUBLIC_API_URL}/api/activities${qs ? `?${qs}` : ""}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) return { activities: [], type, dateFrom, dateTo };
  const raw: unknown = await res.json();
  return {
    activities: isListData(raw) ? raw.data : [],
    type,
    dateFrom,
    dateTo,
  };
};
