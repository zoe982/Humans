import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

interface SearchApiData {
  humans?: unknown[];
  routeSignups?: unknown[];
  activities?: unknown[];
  geoInterests?: unknown[];
  accounts?: unknown[];
}

function isSearchApiData(value: unknown): value is SearchApiData {
  return typeof value === "object" && value !== null;
}

export const load = async ({ locals, cookies, url }: RequestEvent): Promise<{ q: string; humans: unknown[]; routeSignups: unknown[]; activities: unknown[]; geoInterests: unknown[]; accounts: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const q = url.searchParams.get("q") ?? "";
  if (q.trim() === "") {
    return { q, humans: [], routeSignups: [], activities: [], geoInterests: [], accounts: [] };
  }

  const sessionToken = cookies.get("humans_session");
  const res = await fetch(`${PUBLIC_API_URL}/api/search?q=${encodeURIComponent(q)}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) {
    return { q, humans: [], routeSignups: [], activities: [], geoInterests: [], accounts: [] };
  }

  const data: unknown = await res.json();
  const result: SearchApiData = isSearchApiData(data) ? data : {};

  return {
    q,
    humans: result.humans ?? [],
    routeSignups: result.routeSignups ?? [],
    activities: result.activities ?? [],
    geoInterests: result.geoInterests ?? [],
    accounts: result.accounts ?? [],
  };
};
