import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpportunityResponse {
  data: Record<string, unknown>[];
  meta: { page: number; limit: number; total: number };
}

function isOpportunityResponse(value: unknown): value is OpportunityResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data) &&
    "meta" in value
  );
}

// ---------------------------------------------------------------------------
// Terminal stages — excluded from the active pipeline view
// ---------------------------------------------------------------------------

const TERMINAL_STAGES = new Set(["closed_flown", "closed_lost"]);

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export const load = async ({
  locals,
  cookies,
}: RequestEvent): Promise<{
  opportunities: Record<string, unknown>[];
  user: NonNullable<typeof locals.user>;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const apiUrl = `${PUBLIC_API_URL}/api/opportunities?limit=10000`;

  const res = await fetch(apiUrl, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) {
    return { opportunities: [], user: locals.user };
  }

  const raw: unknown = await res.json();
  if (isOpportunityResponse(raw)) {
    const active = raw.data.filter(
      (opp) => typeof opp["stage"] === "string" && !TERMINAL_STAGES.has(opp["stage"]),
    );
    return { opportunities: active, user: locals.user };
  }

  return { opportunities: [], user: locals.user };
};
