import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, failFromApi } from "$lib/server/api";

function formStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{
  routeInterest: Record<string, unknown>;
  humans: unknown[];
  reverseRoute: Record<string, unknown> | null;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id ?? "";
  const headers = { Cookie: `humans_session=${sessionToken ?? ""}` };

  const [riRes, humansRes, listRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/route-interests/${id}`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/humans`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/route-interests`, { headers }),
  ]);

  if (!riRes.ok) redirect(302, "/route-interests");
  const raw: unknown = await riRes.json();
  const routeInterest = isObjData(raw) ? raw.data : null;
  if (routeInterest == null) redirect(302, "/route-interests");

  const humansRaw: unknown = await humansRes.json();
  const humans = isListData(humansRaw) ? humansRaw.data : [];

  // Find reverse route (swap origin/destination)
  // routeInterest is Record<string, unknown> from isObjData — access fields directly
  const riId = routeInterest.id;
  const riOriginCity = routeInterest.originCity;
  const riOriginCountry = routeInterest.originCountry;
  const riDestCity = routeInterest.destinationCity;
  const riDestCountry = routeInterest.destinationCountry;
  let reverseRoute: Record<string, unknown> | null = null;

  if (listRes.ok) {
    const listRaw: unknown = await listRes.json();
    if (isListData(listRaw)) {
      const reverseEntry = listRaw.data.find((item) => {
        if (typeof item !== "object" || item === null) return false;
        return "id" in item && item.id !== riId &&
          "originCity" in item && item.originCity === riDestCity &&
          "originCountry" in item && item.originCountry === riDestCountry &&
          "destinationCity" in item && item.destinationCity === riOriginCity &&
          "destinationCountry" in item && item.destinationCountry === riOriginCountry;
      });
      if (reverseEntry != null && typeof reverseEntry === "object" && "id" in reverseEntry) {
        const reverseRes = await fetch(`${PUBLIC_API_URL}/api/route-interests/${String(reverseEntry.id)}`, { headers });
        if (reverseRes.ok) {
          const reverseRaw: unknown = await reverseRes.json();
          if (isObjData(reverseRaw)) {
            reverseRoute = reverseRaw.data;
          }
        }
      }
    }
  }

  return { routeInterest, humans, reverseRoute };
};

export const actions = {
  delete: async ({ cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | undefined> => {
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";

    const res = await fetch(`${PUBLIC_API_URL}/api/route-interests/${id}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete route interest");
    }

    redirect(302, "/route-interests");
  },

  deleteExpression: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const expressionId = formStr(form.get("expressionId"));

    const res = await fetch(`${PUBLIC_API_URL}/api/route-interest-expressions/${expressionId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete expression");
    }

    return { success: true };
  },

  createExpression: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const humanId = formStr(form.get("humanId")).trim();
    const notesRaw = formStr(form.get("notes")).trim();
    const notes = notesRaw !== "" ? notesRaw : undefined;
    const frequencyVal = formStr(form.get("frequency"));
    const frequency = frequencyVal !== "" ? frequencyVal : "one_time";

    if (humanId === "") {
      return fail(400, { error: "Please select a human." });
    }

    const payload: Record<string, unknown> = {
      humanId,
      routeInterestId: params.id,
      notes,
      frequency,
    };

    const travelYearStr = formStr(form.get("travelYear"));
    if (travelYearStr !== "") payload.travelYear = parseInt(travelYearStr, 10);
    const travelMonthStr = formStr(form.get("travelMonth"));
    if (travelMonthStr !== "") payload.travelMonth = parseInt(travelMonthStr, 10);
    const travelDayStr = formStr(form.get("travelDay"));
    if (travelDayStr !== "") payload.travelDay = parseInt(travelDayStr, 10);

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
      return failFromApi(resBody, res.status, "Failed to create expression.");
    }

    return { success: true };
  },
};
