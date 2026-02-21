import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiErrorInfo } from "$lib/api";

function isObjData(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value;
}

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

function failFromApi(resBody: unknown, status: number, fallback: string): ActionFailure<{ error: string; code?: string; requestId?: string }> {
  const info = extractApiErrorInfo(resBody, fallback);
  return fail(status, { error: info.message, code: info.code, requestId: info.requestId });
}

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id;

  // Fetch activity detail
  const activityRes = await fetch(`${PUBLIC_API_URL}/api/activities/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!activityRes.ok) redirect(302, "/activities");
  const activityRaw: unknown = await activityRes.json();
  const activity = isObjData(activityRaw) ? activityRaw.data : null;
  if (activity == null) redirect(302, "/activities");

  // Fetch humans, accounts, route signups, and website booking requests for dropdowns
  const [humansRes, accountsRes, routeSignupsRes, bookingRequestsRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/humans`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/accounts`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/route-signups?limit=100`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/website-booking-requests?limit=100`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
  ]);

  let humans: unknown[] = [];
  if (humansRes.ok) {
    const raw: unknown = await humansRes.json();
    humans = isListData(raw) ? raw.data : [];
  }

  let accounts: unknown[] = [];
  if (accountsRes.ok) {
    const raw: unknown = await accountsRes.json();
    accounts = isListData(raw) ? raw.data : [];
  }

  let routeSignups: unknown[] = [];
  if (routeSignupsRes.ok) {
    const raw: unknown = await routeSignupsRes.json();
    routeSignups = isListData(raw) ? raw.data : [];
  }

  let websiteBookingRequests: unknown[] = [];
  if (bookingRequestsRes.ok) {
    const raw: unknown = await bookingRequestsRes.json();
    websiteBookingRequests = isListData(raw) ? raw.data : [];
  }

  return { activity, humans, accounts, routeSignups, websiteBookingRequests, apiUrl: PUBLIC_API_URL };
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
};
