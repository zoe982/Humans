import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiErrorInfo } from "$lib/api";

function isDataWithId(value: unknown): value is { data: { id: string } } {
  return typeof value === "object" && value !== null && "data" in value;
}

function failFromApi(resBody: unknown, status: number, fallback: string): ActionFailure<{ error: string; code?: string; requestId?: string }> {
  const info = extractApiErrorInfo(resBody, fallback);
  return fail(status, { error: info.message, code: info.code, requestId: info.requestId });
}

export const load = async ({ locals, cookies }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  // Fetch colleagues for the owner dropdown
  const sessionToken = cookies.get("humans_session");
  const colleaguesRes = await fetch(`${PUBLIC_API_URL}/api/colleagues`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  let colleagues: { id: string; name: string }[] = [];
  if (colleaguesRes.ok) {
    const raw: unknown = await colleaguesRes.json();
    if (typeof raw === "object" && raw !== null && "data" in raw && Array.isArray((raw as { data: unknown }).data)) {
      colleagues = (raw as { data: { id: string; name: string }[] }).data;
    }
  }

  return { colleagues };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const payload = {
      source: form.get("source"),
      notes: form.get("notes") || undefined,
      ownerId: form.get("ownerId") || undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to create general lead");
    }

    const created: unknown = await res.json();
    if (!isDataWithId(created)) {
      return fail(500, { error: "Unexpected response" });
    }

    redirect(302, `/leads/general-leads/${created.data.id}`);
  },
};
