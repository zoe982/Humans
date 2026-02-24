import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isListData, failFromApi } from "$lib/server/api";

function getFormString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

export const load = async ({ locals, cookies }: RequestEvent): Promise<{ routeInterests: unknown[]; expressions: unknown[]; userRole: string }> => {
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

  return { routeInterests, expressions, userRole: locals.user.role };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const originCity = getFormString(form, "originCity").trim();
    const originCountry = getFormString(form, "originCountry").trim();
    const destinationCity = getFormString(form, "destinationCity").trim();
    const destinationCountry = getFormString(form, "destinationCountry").trim();

    if (originCity === "" || originCountry === "" || destinationCity === "" || destinationCountry === "") {
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
    const routeInterestId = getFormString(form, "id");

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
