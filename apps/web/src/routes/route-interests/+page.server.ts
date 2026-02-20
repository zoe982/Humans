import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiErrorInfo } from "$lib/api";

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
  const [routesRes, expressionsRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/route-interests`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/route-interest-expressions`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
  ]);

  let routeInterests: unknown[] = [];
  if (routesRes.ok) {
    const raw: unknown = await routesRes.json();
    routeInterests = isListData(raw) ? raw.data : [];
  }

  let expressions: unknown[] = [];
  if (expressionsRes.ok) {
    const raw: unknown = await expressionsRes.json();
    expressions = isListData(raw) ? raw.data : [];
  }

  return { routeInterests, expressions, userRole: locals.user?.role ?? "viewer" };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const originCity = (form.get("originCity") as string)?.trim();
    const originCountry = (form.get("originCountry") as string)?.trim();
    const destinationCity = (form.get("destinationCity") as string)?.trim();
    const destinationCountry = (form.get("destinationCountry") as string)?.trim();

    if (!originCity || !originCountry || !destinationCity || !destinationCountry) {
      return fail(400, { error: "All origin and destination fields are required." });
    }

    const res = await fetch(`${PUBLIC_API_URL}/api/route-interests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ originCity, originCountry, destinationCity, destinationCountry }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to create route interest.");
    }

    return { success: true };
  },

  delete: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const routeInterestId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/route-interests/${routeInterestId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete route interest");
    }

    return { success: true };
  },
};
