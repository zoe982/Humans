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

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export const load = async ({ locals, url, cookies }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";

  // Fetch human email label configs
  let emailLabelConfigs: unknown[] = [];
  const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/human-email-labels`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });
  if (res.ok) {
    const raw: unknown = await res.json();
    emailLabelConfigs = isListData(raw) ? raw.data : [];
  }

  return {
    prefill: {
      fromSignup: url.searchParams.get("fromSignup") ?? "",
      firstName: url.searchParams.get("firstName") ?? "",
      middleName: url.searchParams.get("middleName") ?? "",
      lastName: url.searchParams.get("lastName") ?? "",
      email: url.searchParams.get("email") ?? "",
    },
    emailLabelConfigs,
  };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    // Collect emails from dynamic form fields
    const emails: { email: string; labelId?: string; isPrimary: boolean }[] = [];
    let i = 0;
    while (form.has(`emails[${i}].email`)) {
      const email = form.get(`emails[${i}].email`) as string;
      const labelId = (form.get(`emails[${i}].labelId`) as string) || undefined;
      const isPrimary = form.get("primaryEmail") === String(i);
      if (email) {
        emails.push({ email, labelId, isPrimary });
      }
      i++;
    }

    // Collect types
    const types = form.getAll("types") as string[];

    const payload = {
      firstName: form.get("firstName"),
      middleName: form.get("middleName") || undefined,
      lastName: form.get("lastName"),
      emails: emails.length > 0 ? emails : [{ email: "", isPrimary: true }],
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

    redirect(302, `/humans/${humanId}`);
  },
};
