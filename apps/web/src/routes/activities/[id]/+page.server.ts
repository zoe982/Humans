import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, failFromApi } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id;
  const headers = { Cookie: `humans_session=${sessionToken ?? ""}` };

  // Helper: fetch + consume body in one step so the connection is released immediately
  const fetchList = async (url: string): Promise<unknown[]> => {
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const raw: unknown = await res.json();
    return isListData(raw) ? raw.data : [];
  };

  // Fetch activity detail
  const activityRes = await fetch(`${PUBLIC_API_URL}/api/activities/${id}`, { headers });

  if (!activityRes.ok) redirect(302, "/activities");
  const activityRaw: unknown = await activityRes.json();
  const activity = isObjData(activityRaw) ? activityRaw.data : null;
  if (activity == null) redirect(302, "/activities");

  // Batch 1 (5 concurrent — each connection closes after body is consumed)
  const [humans, accounts, routeSignups, websiteBookingRequests, colleagues] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/humans`),
    fetchList(`${PUBLIC_API_URL}/api/accounts`),
    fetchList(`${PUBLIC_API_URL}/api/route-signups?limit=100`),
    fetchList(`${PUBLIC_API_URL}/api/website-booking-requests?limit=100`),
    fetchList(`${PUBLIC_API_URL}/api/colleagues`),
  ]);

  // Batch 2 (2 concurrent — batch 1 connections already released)
  const [generalLeads, opportunitiesList] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/general-leads?limit=100`),
    fetchList(`${PUBLIC_API_URL}/api/opportunities?limit=100`),
  ]);

  // Ensure the currently linked route signup is in the options list (may be outside the top 100)
  const activityRecord = activity as Record<string, unknown>;
  const linkedRouteSignupId = activityRecord.routeSignupId;
  if (typeof linkedRouteSignupId === "string" && linkedRouteSignupId !== "") {
    const alreadyPresent = (routeSignups as { id: string }[]).some((s) => s.id === linkedRouteSignupId);
    if (!alreadyPresent) {
      const res = await fetch(`${PUBLIC_API_URL}/api/route-signups/${linkedRouteSignupId}`, { headers });
      if (res.ok) {
        const raw: unknown = await res.json();
        if (isObjData(raw)) {
          (routeSignups as unknown[]).unshift(raw.data);
        }
      }
    }
  }

  // Ensure the currently linked booking request is in the options list
  const linkedBookingId = activityRecord.websiteBookingRequestId;
  if (typeof linkedBookingId === "string" && linkedBookingId !== "") {
    const alreadyPresent = (websiteBookingRequests as { id: string }[]).some((b) => b.id === linkedBookingId);
    if (!alreadyPresent) {
      const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${linkedBookingId}`, { headers });
      if (res.ok) {
        const raw: unknown = await res.json();
        if (isObjData(raw)) {
          (websiteBookingRequests as unknown[]).unshift(raw.data);
        }
      }
    }
  }

  return { activity, humans, accounts, routeSignups, websiteBookingRequests, colleagues, generalLeads, opportunitiesList, apiUrl: PUBLIC_API_URL };
};

export const actions = {
  delete: async ({ cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | void> => {
    const sessionToken = cookies.get("humans_session");
    const id = params.id;

    const res = await fetch(`${PUBLIC_API_URL}/api/activities/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete activity");
    }

    redirect(302, "/activities");
  },

  addGeoInterestExpression: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const geoInterestId = (form.get("geoInterestId") as string)?.trim();
    const humanId = (form.get("humanId") as string)?.trim();

    if (!humanId) {
      return fail(400, { error: "Activity must be linked to a human to add geo-interest expressions." });
    }

    const payload: Record<string, unknown> = {
      humanId,
      activityId: params.id,
      notes: form.get("notes") || undefined,
    };

    if (geoInterestId) {
      payload.geoInterestId = geoInterestId;
    } else {
      payload.city = form.get("city");
      payload.country = form.get("country");
    }

    const res = await fetch(`${PUBLIC_API_URL}/api/geo-interest-expressions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add geo-interest expression");
    }

    return { success: true };
  },

  deleteGeoInterestExpression: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const expressionId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/geo-interest-expressions/${expressionId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete geo-interest expression");
    }

    return { success: true };
  },

  addRouteInterestExpression: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const routeInterestId = (form.get("routeInterestId") as string)?.trim();
    const humanId = (form.get("humanId") as string)?.trim();

    if (!humanId) {
      return fail(400, { error: "Activity must be linked to a human to add route-interest expressions." });
    }

    const payload: Record<string, unknown> = {
      humanId,
      activityId: params.id,
      frequency: form.get("frequency") || "one_time",
      notes: (form.get("notes") as string)?.trim() || undefined,
    };

    const travelYear = form.get("travelYear");
    const travelMonth = form.get("travelMonth");
    const travelDay = form.get("travelDay");
    if (travelYear) payload.travelYear = Number(travelYear);
    if (travelMonth) payload.travelMonth = Number(travelMonth);
    if (travelDay) payload.travelDay = Number(travelDay);

    if (routeInterestId) {
      payload.routeInterestId = routeInterestId;
    } else {
      payload.originCity = form.get("originCity");
      payload.originCountry = form.get("originCountry");
      payload.destinationCity = form.get("destinationCity");
      payload.destinationCountry = form.get("destinationCountry");
    }

    const res = await fetch(`${PUBLIC_API_URL}/api/route-interest-expressions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add route-interest expression");
    }

    return { success: true };
  },

  deleteRouteInterestExpression: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const expressionId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/route-interest-expressions/${expressionId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete route-interest expression");
    }

    return { success: true };
  },

  linkOpportunity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const opportunityId = (form.get("opportunityId") as string)?.trim();

    if (!opportunityId) {
      return fail(400, { error: "Please select an opportunity to link." });
    }

    const res = await fetch(`${PUBLIC_API_URL}/api/activities/${params.id}/opportunities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ opportunityId }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to link opportunity");
    }

    return { success: true };
  },

  unlinkOpportunity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const linkId = (form.get("linkId") as string)?.trim();

    const res = await fetch(`${PUBLIC_API_URL}/api/activities/${params.id}/opportunities/${linkId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to unlink opportunity");
    }

    return { success: true };
  },
};
