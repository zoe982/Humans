import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, failFromApi } from "$lib/server/api";

function formStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{
  activity: Record<string, unknown>;
  humans: unknown[];
  accounts: unknown[];
  routeSignups: unknown[];
  websiteBookingRequests: unknown[];
  colleagues: unknown[];
  generalLeads: unknown[];
  opportunitiesList: unknown[];
  apiUrl: string;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id ?? "";
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

  // Batch 1 (4 concurrent — Cloudflare Workers limit: 6 TCP, auth uses 1, safety margin 1)
  const [humans, accounts, routeSignups, websiteBookingRequests] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/humans`),
    fetchList(`${PUBLIC_API_URL}/api/accounts`),
    fetchList(`${PUBLIC_API_URL}/api/route-signups?limit=100`),
    fetchList(`${PUBLIC_API_URL}/api/website-booking-requests?limit=100`),
  ]);

  // Batch 2 (3 concurrent — batch 1 connections already released)
  const [colleagues, generalLeads, opportunitiesList] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/colleagues`),
    fetchList(`${PUBLIC_API_URL}/api/general-leads?limit=100`),
    fetchList(`${PUBLIC_API_URL}/api/opportunities?limit=100`),
  ]);

  // Ensure the currently linked route signup is in the options list (may be outside the top 100)
  const activityRecord = activity;
  const linkedRouteSignupId = activityRecord.routeSignupId;
  if (typeof linkedRouteSignupId === "string" && linkedRouteSignupId !== "") {
    const alreadyPresent = routeSignups.some((s) => typeof s === "object" && s !== null && "id" in s && s.id === linkedRouteSignupId);
    if (!alreadyPresent) {
      const res = await fetch(`${PUBLIC_API_URL}/api/route-signups/${linkedRouteSignupId}`, { headers });
      if (res.ok) {
        const raw: unknown = await res.json();
        if (isObjData(raw)) {
          routeSignups.unshift(raw.data);
        }
      }
    }
  }

  // Ensure the currently linked booking request is in the options list
  const linkedBookingId = activityRecord.websiteBookingRequestId;
  if (typeof linkedBookingId === "string" && linkedBookingId !== "") {
    const alreadyPresent = websiteBookingRequests.some((b) => typeof b === "object" && b !== null && "id" in b && b.id === linkedBookingId);
    if (!alreadyPresent) {
      const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${linkedBookingId}`, { headers });
      if (res.ok) {
        const raw: unknown = await res.json();
        if (isObjData(raw)) {
          websiteBookingRequests.unshift(raw.data);
        }
      }
    }
  }

  return { activity, humans, accounts, routeSignups, websiteBookingRequests, colleagues, generalLeads, opportunitiesList, apiUrl: PUBLIC_API_URL };
};

export const actions = {
  delete: async ({ cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | undefined> => {
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";

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

    const geoInterestId = formStr(form.get("geoInterestId")).trim();
    const humanId = formStr(form.get("humanId")).trim();

    if (humanId === "") {
      return fail(400, { error: "Activity must be linked to a human to add geo-interest expressions." });
    }

    const notesVal = formStr(form.get("notes"));
    const payload: Record<string, unknown> = {
      humanId,
      activityId: params.id,
      notes: notesVal !== "" ? notesVal : undefined,
    };

    if (geoInterestId !== "") {
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
    const expressionId = formStr(form.get("id"));

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

    const routeInterestId = formStr(form.get("routeInterestId")).trim();
    const humanId = formStr(form.get("humanId")).trim();

    if (humanId === "") {
      return fail(400, { error: "Activity must be linked to a human to add route-interest expressions." });
    }

    const frequencyVal = formStr(form.get("frequency"));
    const notesRaw = formStr(form.get("notes")).trim();
    const payload: Record<string, unknown> = {
      humanId,
      activityId: params.id,
      frequency: frequencyVal !== "" ? frequencyVal : "one_time",
      notes: notesRaw !== "" ? notesRaw : undefined,
    };

    const travelYear = form.get("travelYear");
    const travelMonth = form.get("travelMonth");
    const travelDay = form.get("travelDay");
    if (travelYear != null && travelYear !== "") payload.travelYear = Number(travelYear);
    if (travelMonth != null && travelMonth !== "") payload.travelMonth = Number(travelMonth);
    if (travelDay != null && travelDay !== "") payload.travelDay = Number(travelDay);

    if (routeInterestId !== "") {
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
    const expressionId = formStr(form.get("id"));

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
    const opportunityId = formStr(form.get("opportunityId")).trim();
    const id = params.id ?? "";

    if (opportunityId === "") {
      return fail(400, { error: "Please select an opportunity to link." });
    }

    const res = await fetch(`${PUBLIC_API_URL}/api/activities/${id}/opportunities`, {
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
    const linkId = formStr(form.get("linkId")).trim();
    const id = params.id ?? "";

    const res = await fetch(`${PUBLIC_API_URL}/api/activities/${id}/opportunities/${linkId}`, {
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
