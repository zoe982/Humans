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

export const load = async ({ locals, cookies }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");

  const [humansRes, accountsRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/humans`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/accounts`, {
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

  return { humans, accounts, apiUrl: PUBLIC_API_URL };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | void> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const humanId = (form.get("humanId") as string) || undefined;
    const accountId = (form.get("accountId") as string) || undefined;

    const payload = {
      type: form.get("type"),
      subject: (form.get("subject") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
      activityDate: new Date(form.get("activityDate") as string).toISOString(),
      humanId,
      accountId,
    };

    if (!humanId) {
      return fail(400, { error: "A linked human is required." });
    }

    const res = await fetch(`${PUBLIC_API_URL}/api/activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    const resBody: unknown = await res.json();

    if (!res.ok) {
      return failFromApi(resBody, res.status, "Failed to create activity");
    }

    let activityId: string | undefined;
    if (isObjData(resBody)) {
      activityId = (resBody.data as { id?: string }).id;
    }

    // Create geo-interest expressions from JSON array
    const geoInterestsRaw = (form.get("geoInterestsJson") as string)?.trim();
    if (geoInterestsRaw) {
      try {
        const geoItems = JSON.parse(geoInterestsRaw) as Array<{ id?: string; city?: string; country?: string; notes?: string }>;
        for (const geo of geoItems) {
          const geoPayload: Record<string, unknown> = {
            humanId,
            activityId,
            notes: geo.notes || undefined,
          };
          if (geo.id) {
            geoPayload.geoInterestId = geo.id;
          } else {
            geoPayload.city = geo.city;
            geoPayload.country = geo.country;
          }
          await fetch(`${PUBLIC_API_URL}/api/geo-interest-expressions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `humans_session=${sessionToken ?? ""}`,
            },
            body: JSON.stringify(geoPayload),
          });
        }
      } catch { /* ignore malformed JSON */ }
    }

    // Create route-interest expressions from JSON array
    const routeInterestsRaw = (form.get("routeInterestsJson") as string)?.trim();
    if (routeInterestsRaw) {
      try {
        const routeItems = JSON.parse(routeInterestsRaw) as Array<{
          id?: string; originCity?: string; originCountry?: string;
          destinationCity?: string; destinationCountry?: string;
          frequency?: string; travelYear?: number; travelMonth?: number; travelDay?: number; notes?: string;
        }>;
        for (const route of routeItems) {
          const routePayload: Record<string, unknown> = {
            humanId,
            activityId,
            frequency: route.frequency || "one_time",
            notes: route.notes || undefined,
          };
          if (route.id) {
            routePayload.routeInterestId = route.id;
          } else {
            routePayload.originCity = route.originCity;
            routePayload.originCountry = route.originCountry;
            routePayload.destinationCity = route.destinationCity;
            routePayload.destinationCountry = route.destinationCountry;
          }
          if (route.travelYear) routePayload.travelYear = route.travelYear;
          if (route.travelMonth) routePayload.travelMonth = route.travelMonth;
          if (route.travelDay) routePayload.travelDay = route.travelDay;
          await fetch(`${PUBLIC_API_URL}/api/route-interest-expressions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `humans_session=${sessionToken ?? ""}`,
            },
            body: JSON.stringify(routePayload),
          });
        }
      } catch { /* ignore malformed JSON */ }
    }

    redirect(302, "/activities");
  },
};
