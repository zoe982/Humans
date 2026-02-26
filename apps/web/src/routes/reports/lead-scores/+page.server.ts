import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

interface ScoreListResponse {
  data: unknown[];
  meta: { page: number; limit: number; total: number };
}

function isScoreListResponse(value: unknown): value is ScoreListResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as ScoreListResponse).data) &&
    "meta" in value
  );
}

export const load = async ({ locals, cookies, url }: RequestEvent): Promise<{
  scores: unknown[];
  meta: { page: number; limit: number; total: number };
  user: NonNullable<typeof locals.user>;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");

  // Forward filter params to API
  const params = new URLSearchParams();
  const band = url.searchParams.get("band");
  if (band != null && band !== "") params.set("band", band);
  const parentType = url.searchParams.get("parentType");
  if (parentType != null && parentType !== "") params.set("parentType", parentType);
  const page = url.searchParams.get("page");
  if (page != null && page !== "") params.set("page", page);
  const q = url.searchParams.get("q");
  if (q != null && q !== "") params.set("q", q);

  const qs = params.toString();
  const apiUrl = `${PUBLIC_API_URL}/api/lead-scores${qs !== "" ? `?${qs}` : ""}`;

  const res = await fetch(apiUrl, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) {
    return { scores: [], meta: { page: 1, limit: 25, total: 0 }, user: locals.user };
  }

  const raw: unknown = await res.json();
  if (isScoreListResponse(raw)) {
    return { scores: raw.data, meta: raw.meta, user: locals.user };
  }

  return { scores: [], meta: { page: 1, limit: 25, total: 0 }, user: locals.user };
};
