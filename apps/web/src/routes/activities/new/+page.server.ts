import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, failFromApi } from "$lib/server/api";

function formStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) return {};
  return Object.fromEntries(Object.entries(value));
}

export const load = async ({ locals, cookies }: RequestEvent): Promise<{
  humans: unknown[];
  accounts: unknown[];
  routeSignups: unknown[];
  websiteBookingRequests: unknown[];
  apiUrl: string;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");

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

  return { humans, accounts, routeSignups, websiteBookingRequests, apiUrl: PUBLIC_API_URL };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | undefined> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const humanIdVal = formStr(form.get("humanId"));
    const accountIdVal = formStr(form.get("accountId"));
    const routeSignupIdVal = formStr(form.get("routeSignupId"));
    const websiteBookingRequestIdVal = formStr(form.get("websiteBookingRequestId"));

    const humanId = humanIdVal !== "" ? humanIdVal : undefined;
    const accountId = accountIdVal !== "" ? accountIdVal : undefined;
    const routeSignupId = routeSignupIdVal !== "" ? routeSignupIdVal : undefined;
    const websiteBookingRequestId = websiteBookingRequestIdVal !== "" ? websiteBookingRequestIdVal : undefined;

    const subjectVal = formStr(form.get("subject"));
    const notesVal = formStr(form.get("notes"));
    const activityDateVal = formStr(form.get("activityDate"));

    const payload = {
      type: form.get("type"),
      subject: subjectVal !== "" ? subjectVal : undefined,
      notes: notesVal !== "" ? notesVal : undefined,
      activityDate: new Date(activityDateVal).toISOString(),
      humanId,
      accountId,
      routeSignupId,
      websiteBookingRequestId,
    };

    if (humanId == null && accountId == null && routeSignupId == null && websiteBookingRequestId == null) {
      return fail(400, { error: "At least one linked entity is required." });
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
    const geoInterestsRaw = formStr(form.get("geoInterestsJson")).trim();
    if (geoInterestsRaw !== "") {
      try {
        const geoParsed: unknown = JSON.parse(geoInterestsRaw);
        if (Array.isArray(geoParsed)) {
          for (const geoRaw of geoParsed) {
            const geo = toRecord(geoRaw);
            const geoId = typeof geo.id === "string" ? geo.id : "";
            const geoNotes = typeof geo.notes === "string" && geo.notes !== "" ? geo.notes : undefined;
            const geoPayload: Record<string, unknown> = {
              humanId,
              activityId,
              notes: geoNotes,
            };
            if (geoId !== "") {
              geoPayload.geoInterestId = geoId;
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
        }
      } catch { /* ignore malformed JSON */ }
    }

    // Create route-interest expressions from JSON array
    const routeInterestsRaw = formStr(form.get("routeInterestsJson")).trim();
    if (routeInterestsRaw !== "") {
      try {
        const routeParsed: unknown = JSON.parse(routeInterestsRaw);
        if (Array.isArray(routeParsed)) {
          for (const routeRaw of routeParsed) {
            const route = toRecord(routeRaw);
            const routeId = typeof route.id === "string" ? route.id : "";
            const routeFrequency = typeof route.frequency === "string" && route.frequency !== "" ? route.frequency : "one_time";
            const routeNotes = typeof route.notes === "string" && route.notes !== "" ? route.notes : undefined;
            const routePayload: Record<string, unknown> = {
              humanId,
              activityId,
              frequency: routeFrequency,
              notes: routeNotes,
            };
            if (routeId !== "") {
              routePayload.routeInterestId = routeId;
            } else {
              routePayload.originCity = route.originCity;
              routePayload.originCountry = route.originCountry;
              routePayload.destinationCity = route.destinationCity;
              routePayload.destinationCountry = route.destinationCountry;
            }
            if (typeof route.travelYear === "number") routePayload.travelYear = route.travelYear;
            if (typeof route.travelMonth === "number") routePayload.travelMonth = route.travelMonth;
            if (typeof route.travelDay === "number") routePayload.travelDay = route.travelDay;
            await fetch(`${PUBLIC_API_URL}/api/route-interest-expressions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Cookie: `humans_session=${sessionToken ?? ""}`,
              },
              body: JSON.stringify(routePayload),
            });
          }
        }
      } catch { /* ignore malformed JSON */ }
    }

    redirect(302, "/activities");
  },
};
