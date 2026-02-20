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

  const [riRes, humansRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/route-interests/${id}`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/humans`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
  ]);

  if (!riRes.ok) redirect(302, "/route-interests");
  const raw: unknown = await riRes.json();
  const routeInterest = isObjData(raw) ? raw.data : null;
  if (routeInterest == null) redirect(302, "/route-interests");

  const humansRaw: unknown = await humansRes.json();
  const humans = isListData(humansRaw) ? humansRaw.data : [];

  return { routeInterest, humans };
};

export const actions = {
  delete: async ({ cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | void> => {
    const sessionToken = cookies.get("humans_session");
    const id = params.id;

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
    const expressionId = form.get("expressionId");

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
    const humanId = (form.get("humanId") as string)?.trim();
    const notes = (form.get("notes") as string)?.trim() || undefined;
    const frequency = (form.get("frequency") as string) || "one_time";

    if (!humanId) {
      return fail(400, { error: "Please select a human." });
    }

    const payload: Record<string, unknown> = {
      humanId,
      routeInterestId: params.id,
      notes,
      frequency,
    };

    const travelYearStr = form.get("travelYear") as string;
    if (travelYearStr) payload.travelYear = parseInt(travelYearStr, 10);
    const travelMonthStr = form.get("travelMonth") as string;
    if (travelMonthStr) payload.travelMonth = parseInt(travelMonthStr, 10);
    const travelDayStr = form.get("travelDay") as string;
    if (travelDayStr) payload.travelDay = parseInt(travelDayStr, 10);

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
