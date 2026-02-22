import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiErrorInfo } from "$lib/api";

function failFromApi(resBody: unknown, status: number, fallback: string): ActionFailure<{ error: string; code?: string; requestId?: string }> {
  const info = extractApiErrorInfo(resBody, fallback);
  return fail(status, { error: info.message, code: info.code, requestId: info.requestId });
}

function isDataWithId(value: unknown): value is { data: { id: string } } {
  return typeof value === "object" && value !== null && "data" in value;
}

export const load = async ({ locals, url }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  return {
    prefill: {
      fromSignup: url.searchParams.get("fromSignup") ?? "",
      fromGeneralLead: url.searchParams.get("fromGeneralLead") ?? "",
      firstName: url.searchParams.get("firstName") ?? "",
      middleName: url.searchParams.get("middleName") ?? "",
      lastName: url.searchParams.get("lastName") ?? "",
      notes: url.searchParams.get("notes") ?? "",
    },
  };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    // Collect types
    const types = form.getAll("types") as string[];

    const payload = {
      firstName: form.get("firstName"),
      middleName: form.get("middleName") || undefined,
      lastName: form.get("lastName"),
      emails: [],
      types: types.length > 0 ? types : [],
    };

    const fromSignup = form.get("fromSignup") as string;
    const fromGeneralLead = form.get("fromGeneralLead") as string;

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
      return failFromApi(resBody, res.status, "Failed to create human");
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

    // If converting from a general lead, call the convert endpoint
    if (fromGeneralLead) {
      const convertRes = await fetch(`${PUBLIC_API_URL}/api/general-leads/${fromGeneralLead}/convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `humans_session=${sessionToken ?? ""}`,
        },
        body: JSON.stringify({ humanId }),
      });

      if (!convertRes.ok) {
        // Human was created but convert failed — redirect to human anyway
        redirect(302, `/humans/${humanId}`);
      }
    }

    redirect(302, `/humans/${humanId}`);
  },
};
