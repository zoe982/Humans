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

    // If geo-interest fields are present, create a geo-interest expression linked to this activity
    const geoInterestId = (form.get("geoInterestId") as string)?.trim();
    const geoCity = (form.get("geoCity") as string)?.trim();
    const geoCountry = (form.get("geoCountry") as string)?.trim();
    if (geoInterestId || (geoCity && geoCountry)) {
      let activityId: string | undefined;
      if (isObjData(resBody)) {
        activityId = (resBody.data as { id?: string }).id;
      }

      const geoPayload: Record<string, unknown> = {
        humanId,
        notes: (form.get("geoNotes") as string)?.trim() || undefined,
        activityId,
      };

      if (geoInterestId) {
        geoPayload.geoInterestId = geoInterestId;
      } else {
        geoPayload.city = geoCity;
        geoPayload.country = geoCountry;
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

    // If route-interest fields are present, create a route-interest expression linked to this activity
    const routeInterestId = (form.get("routeInterestId") as string)?.trim();
    const routeOriginCity = (form.get("routeOriginCity") as string)?.trim();
    const routeOriginCountry = (form.get("routeOriginCountry") as string)?.trim();
    const routeDestCity = (form.get("routeDestinationCity") as string)?.trim();
    const routeDestCountry = (form.get("routeDestinationCountry") as string)?.trim();

    if (routeInterestId || (routeOriginCity && routeOriginCountry && routeDestCity && routeDestCountry)) {
      let activityId: string | undefined;
      if (isObjData(resBody)) {
        activityId = (resBody.data as { id?: string }).id;
      }

      const routePayload: Record<string, unknown> = {
        humanId,
        activityId,
        frequency: form.get("routeFrequency") || "one_time",
        notes: (form.get("routeNotes") as string)?.trim() || undefined,
      };

      const routeTravelYear = form.get("routeTravelYear");
      const routeTravelMonth = form.get("routeTravelMonth");
      const routeTravelDay = form.get("routeTravelDay");
      if (routeTravelYear) routePayload.travelYear = Number(routeTravelYear);
      if (routeTravelMonth) routePayload.travelMonth = Number(routeTravelMonth);
      if (routeTravelDay) routePayload.travelDay = Number(routeTravelDay);

      if (routeInterestId) {
        routePayload.routeInterestId = routeInterestId;
      } else {
        routePayload.originCity = routeOriginCity;
        routePayload.originCountry = routeOriginCountry;
        routePayload.destinationCity = routeDestCity;
        routePayload.destinationCountry = routeDestCountry;
      }

      await fetch(`${PUBLIC_API_URL}/api/route-interest-expressions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `humans_session=${sessionToken ?? ""}`,
        },
        body: JSON.stringify(routePayload),
      });
    }

    redirect(302, "/activities");
  },
};
