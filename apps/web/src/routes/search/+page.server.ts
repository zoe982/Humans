import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

export const load = async ({ locals, cookies, url }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const q = url.searchParams.get("q") ?? "";
  if (!q.trim()) {
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
  const result = data as { humans?: unknown[]; routeSignups?: unknown[]; activities?: unknown[]; geoInterests?: unknown[]; accounts?: unknown[] };

  return {
    q,
    humans: result.humans ?? [],
    routeSignups: result.routeSignups ?? [],
    activities: result.activities ?? [],
    geoInterests: result.geoInterests ?? [],
    accounts: result.accounts ?? [],
  };
};
