import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isErrorBody(value: unknown): value is { error?: string } {
  return typeof value === "object" && value !== null;
}

function isDataWithId(value: unknown): value is { data: { id: string } } {
  return typeof value === "object" && value !== null && "data" in value;
}

export const load = async ({ locals, url }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  return {
    prefill: {
      fromSignup: url.searchParams.get("fromSignup") ?? "",
      firstName: url.searchParams.get("firstName") ?? "",
      middleName: url.searchParams.get("middleName") ?? "",
      lastName: url.searchParams.get("lastName") ?? "",
      email: url.searchParams.get("email") ?? "",
    },
  };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    // Collect emails from dynamic form fields
    const emails: { email: string; label: string; isPrimary: boolean }[] = [];
    let i = 0;
    while (form.has(`emails[${i}].email`)) {
      const email = form.get(`emails[${i}].email`) as string;
      const label = (form.get(`emails[${i}].label`) as string) || "personal";
      const isPrimary = form.get("primaryEmail") === String(i);
      if (email) {
        emails.push({ email, label, isPrimary });
      }
      i++;
    }

    // Collect types
    const types = form.getAll("types") as string[];

    const payload = {
      firstName: form.get("firstName"),
      middleName: form.get("middleName") || undefined,
      lastName: form.get("lastName"),
      emails: emails.length > 0 ? emails : [{ email: "", label: "personal", isPrimary: true }],
      types: types.length > 0 ? types : [],
    };

    const fromSignup = form.get("fromSignup") as string;

    // Create the human
    const res = await fetch(`${PUBLIC_API_URL}/api/humans`, {
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
      return fail(res.status, { error: body.error ?? "Failed to create human" });
    }

    const created: unknown = await res.json();
    if (!isDataWithId(created)) {
      return fail(500, { error: "Unexpected response" });
    }

    const humanId = created.data.id;

    // If converting from a signup, call the convert endpoint
    if (fromSignup) {
      const convertRes = await fetch(`${PUBLIC_API_URL}/api/humans/${humanId}/convert-from-signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `humans_session=${sessionToken ?? ""}`,
        },
        body: JSON.stringify({ routeSignupId: fromSignup }),
      });

      if (!convertRes.ok) {
        // Human was created but convert failed — redirect to human anyway
        redirect(302, `/humans/${humanId}`);
      }
    }

    redirect(302, `/humans/${humanId}`);
  },
};
