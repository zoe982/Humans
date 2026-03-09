import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeadsResponse {
  data: Record<string, unknown>[];
}

function isLeadsResponse(value: unknown): value is LeadsResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  );
}

// ---------------------------------------------------------------------------
// Terminal statuses — excluded from the active pipeline view
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set(["closed_lost", "closed_converted"]);

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export const load = async ({
  locals,
  cookies,
}: RequestEvent): Promise<{
  leads: Record<string, unknown>[];
  user: NonNullable<typeof locals.user>;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const apiUrl = `${PUBLIC_API_URL}/api/leads/all`;

  const res = await fetch(apiUrl, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) {
    return { leads: [], user: locals.user };
  }

  const raw: unknown = await res.json();
  if (isLeadsResponse(raw)) {
    const active = raw.data.filter((lead) => {
      const status = lead["status"];
      if (typeof status !== "string") return false;
      // Terminal for all types
      if (TERMINAL_STATUSES.has(status)) return false;
      // BORs: qualified is also terminal (they graduate to opportunities)
      if (lead["leadType"] === "website_booking_request" && status === "qualified") return false;
      return true;
    });
    return { leads: active, user: locals.user };
  }

  return { leads: [], user: locals.user };
};
