import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isErrorBody(value: unknown): value is { error?: string } {
  return typeof value === "object" && value !== null;
}

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export const load = async ({ locals, cookies }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const res = await fetch(`${PUBLIC_API_URL}/api/humans`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) return { humans: [] };
  const raw: unknown = await res.json();
  return {
    humans: isListData(raw) ? raw.data : [],
  };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string }> | void> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const humanId = (form.get("humanId") as string) || undefined;

    const payload = {
      type: form.get("type"),
      subject: form.get("subject"),
      notes: (form.get("notes") as string) || undefined,
      activityDate: new Date(form.get("activityDate") as string).toISOString(),
      humanId,
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

    if (!res.ok) {
      const resBody: unknown = await res.json();
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to create activity" });
    }

    redirect(302, "/activities");
  },
};
