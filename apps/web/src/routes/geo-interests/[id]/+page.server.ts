import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isObjData(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value;
}

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

function isErrorBody(value: unknown): value is { error?: string } {
  return typeof value === "object" && value !== null;
}

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id;

  const [giRes, humansRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/geo-interests/${id}`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/humans`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
  ]);

  if (!giRes.ok) redirect(302, "/geo-interests");
  const raw: unknown = await giRes.json();
  const geoInterest = isObjData(raw) ? raw.data : null;
  if (geoInterest == null) redirect(302, "/geo-interests");

  const humansRaw: unknown = await humansRes.json();
  const humans = isListData(humansRaw) ? humansRaw.data : [];

  return { geoInterest, humans };
};

export const actions = {
  delete: async ({ cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | void> => {
    const sessionToken = cookies.get("humans_session");
    const id = params.id;

    const res = await fetch(`${PUBLIC_API_URL}/api/geo-interests/${id}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to delete geo-interest" });
    }

    redirect(302, "/geo-interests");
  },

  deleteExpression: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const expressionId = form.get("expressionId");

    const res = await fetch(`${PUBLIC_API_URL}/api/geo-interest-expressions/${expressionId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to delete expression" });
    }

    return { success: true };
  },

  createExpression: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const humanId = (form.get("humanId") as string)?.trim();
    const notes = (form.get("notes") as string)?.trim() || undefined;

    if (!humanId) {
      return fail(400, { error: "Please select a human." });
    }

    const res = await fetch(`${PUBLIC_API_URL}/api/geo-interest-expressions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({
        humanId,
        geoInterestId: params.id,
        notes,
      }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to create expression." });
    }

    return { success: true };
  },
};
