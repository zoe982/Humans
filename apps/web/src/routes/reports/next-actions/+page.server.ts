import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NextActionsResponse {
  data: Record<string, unknown>[];
}

interface ColleaguesResponse {
  data: Record<string, unknown>[];
}

function isNextActionsResponse(value: unknown): value is NextActionsResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  );
}

function isColleaguesResponse(value: unknown): value is ColleaguesResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  );
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export const load = async ({
  locals,
  cookies,
  url,
}: RequestEvent): Promise<{
  nextActions: Record<string, unknown>[];
  colleagues: Record<string, unknown>[];
  selectedColleagueId: string | null;
  user: NonNullable<typeof locals.user>;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const headers = { Cookie: `humans_session=${sessionToken ?? ""}` };

  const selectedColleagueId = url.searchParams.get("colleagueId");

  // Fetch colleagues and next actions in parallel
  const nextActionsParams = new URLSearchParams();
  if (selectedColleagueId != null && selectedColleagueId !== "") {
    nextActionsParams.set("colleagueId", selectedColleagueId);
  }
  const qs = nextActionsParams.toString();
  const nextActionsUrl = `${PUBLIC_API_URL}/api/reports/next-actions${qs !== "" ? `?${qs}` : ""}`;
  const colleaguesUrl = `${PUBLIC_API_URL}/api/colleagues`;

  const [nextActionsRes, colleaguesRes] = await Promise.all([
    fetch(nextActionsUrl, { headers }),
    fetch(colleaguesUrl, { headers }),
  ]);

  let nextActions: Record<string, unknown>[] = [];
  if (nextActionsRes.ok) {
    const raw: unknown = await nextActionsRes.json();
    if (isNextActionsResponse(raw)) {
      nextActions = raw.data;
    }
  }

  let colleagues: Record<string, unknown>[] = [];
  if (colleaguesRes.ok) {
    const raw: unknown = await colleaguesRes.json();
    if (isColleaguesResponse(raw)) {
      colleagues = raw.data;
    }
  }

  return {
    nextActions,
    colleagues,
    selectedColleagueId,
    user: locals.user,
  };
};
