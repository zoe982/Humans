import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { PUBLIC_API_URL } from "$env/static/public";
import { formatDate } from "$lib/utils/format";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  category: string;
}

interface ApiSearchData {
  humans?: { id: string; firstName: string; lastName: string; emails?: { email: string }[] }[];
  accounts?: { id: string; name: string; status: string }[];
  activities?: { id: string; type: string; subject: string; activityDate: string }[];
  geoInterests?: { id: string; city: string; country: string }[];
  routeSignups?: { id: string; first_name?: string | null; last_name?: string | null; email?: string | null; origin?: string | null; destination?: string | null }[];
}

function isApiSearchData(value: unknown): value is ApiSearchData {
  return typeof value === "object" && value !== null;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  const q = url.searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return json({ results: [] });
  }

  const sessionToken = cookies.get("humans_session");
  const res = await fetch(`${PUBLIC_API_URL}/api/search?q=${encodeURIComponent(q)}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) {
    return json({ results: [] });
  }

  const raw: unknown = await res.json();
  const data: ApiSearchData = isApiSearchData(raw) ? raw : {};

  const results: SearchResult[] = [];

  for (const h of data.humans ?? []) {
    results.push({
      id: `human-${h.id}`,
      label: `${h.firstName} ${h.lastName}`,
      sublabel: h.emails?.[0]?.email,
      href: `/humans/${h.id}`,
      category: "Humans",
    });
  }

  for (const a of data.accounts ?? []) {
    results.push({
      id: `account-${a.id}`,
      label: a.name,
      sublabel: a.status,
      href: `/accounts/${a.id}`,
      category: "Accounts",
    });
  }

  for (const s of data.routeSignups ?? []) {
    const nameParts = [s.first_name, s.last_name].filter(Boolean).join(" ");
    const name = nameParts !== "" ? nameParts : (s.email ?? "—");
    const route = [s.origin, s.destination].filter(Boolean).join(" → ");
    results.push({
      id: `signup-${s.id}`,
      label: name,
      sublabel: route !== "" ? route : undefined,
      href: `/leads/route-signups/${s.id}`,
      category: "Route Signups",
    });
  }

  for (const act of data.activities ?? []) {
    results.push({
      id: `activity-${act.id}`,
      label: act.subject,
      sublabel: formatDate(act.activityDate),
      href: `/activities/${act.id}`,
      category: "Activities",
    });
  }

  for (const gi of data.geoInterests ?? []) {
    results.push({
      id: `geo-${gi.id}`,
      label: `${gi.city}, ${gi.country}`,
      href: `/geo-interests/${gi.id}`,
      category: "Geo-Interests",
    });
  }

  return json({ results: results.slice(0, 20) });
};
