import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

function isErrorBody(value: unknown): value is { error?: string } {
  return typeof value === "object" && value !== null;
}

export const load = async ({ locals, cookies }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const res = await fetch(`${PUBLIC_API_URL}/api/geo-interests`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) return { geoInterests: [] };
  const raw: unknown = await res.json();
  return { geoInterests: isListData(raw) ? raw.data : [] };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const city = (form.get("city") as string)?.trim();
    const country = (form.get("country") as string)?.trim();

    if (!city || !country) {
      return fail(400, { error: "City and country are required." });
    }

    const res = await fetch(`${PUBLIC_API_URL}/api/geo-interests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ city, country }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to create geo-interest." });
    }

    return { success: true };
  },
};
