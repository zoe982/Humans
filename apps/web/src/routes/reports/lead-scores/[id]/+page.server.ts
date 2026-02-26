import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{
  score: Record<string, unknown>;
  parentEntity: Record<string, unknown> | null;
  user: NonNullable<typeof locals.user>;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const headers = { Cookie: `humans_session=${sessionToken ?? ""}` };
  const id = params.id ?? "";

  const res = await fetch(`${PUBLIC_API_URL}/api/lead-scores/${id}`, { headers });

  if (!res.ok) redirect(302, "/reports/lead-scores");
  const raw: unknown = await res.json();
  const score = isObjData(raw) ? raw.data : null;
  if (score == null) redirect(302, "/reports/lead-scores");

  // Fetch the parent entity for context
  const scoreObj = score as Record<string, unknown>;
  const parentType = scoreObj.generalLeadId != null ? "general_lead"
    : scoreObj.websiteBookingRequestId != null ? "website_booking_request"
    : "route_signup";
  const parentId = (scoreObj.generalLeadId ?? scoreObj.websiteBookingRequestId ?? scoreObj.routeSignupId) as string;

  const parentApiPath = parentType === "general_lead" ? `/api/general-leads/${parentId}`
    : parentType === "website_booking_request" ? `/api/website-booking-requests/${parentId}`
    : `/api/route-signups/${parentId}`;

  let parentEntity: Record<string, unknown> | null = null;
  try {
    const parentRes = await fetch(`${PUBLIC_API_URL}${parentApiPath}`, { headers });
    if (parentRes.ok) {
      const parentRaw: unknown = await parentRes.json();
      if (isObjData(parentRaw)) {
        parentEntity = { ...(parentRaw.data as Record<string, unknown>), type: parentType };
      }
    }
  } catch {
    // Graceful degradation — page still works without parent context
  }

  return { score, parentEntity, user: locals.user };
};
