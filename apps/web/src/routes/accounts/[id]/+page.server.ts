import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiError } from "$lib/api";

function isObjData(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value;
}

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id;

  // Fetch account detail
  const accountRes = await fetch(`${PUBLIC_API_URL}/api/accounts/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });

  if (!accountRes.ok) redirect(302, "/accounts");
  const accountRaw: unknown = await accountRes.json();
  const account = isObjData(accountRaw) ? accountRaw.data : null;
  if (account == null) redirect(302, "/accounts");

  // Fetch config lists for dropdowns + humans list for linking
  const [typesRes, humanLabelsRes, emailLabelsRes, phoneLabelsRes, humansRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-types`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-human-labels`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-email-labels`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-phone-labels`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/humans`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
  ]);

  const parseList = async (res: Response) => {
    if (!res.ok) return [];
    const raw: unknown = await res.json();
    return isListData(raw) ? raw.data : [];
  };

  const [typeConfigs, humanLabelConfigs, emailLabelConfigs, phoneLabelConfigs, allHumans] = await Promise.all([
    parseList(typesRes),
    parseList(humanLabelsRes),
    parseList(emailLabelsRes),
    parseList(phoneLabelsRes),
    parseList(humansRes),
  ]);

  return {
    account,
    typeConfigs,
    humanLabelConfigs,
    emailLabelConfigs,
    phoneLabelConfigs,
    allHumans,
  };
};

export const actions = {
  addEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = params.id;

    const payload = {
      email: form.get("email"),
      labelId: form.get("labelId") || undefined,
      isPrimary: form.get("isPrimary") === "on",
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/accounts/${id}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return fail(res.status, { error: extractApiError(resBody, "Failed to add email") });
    }

    return { success: true };
  },

  deleteEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = params.id;
    const emailId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/accounts/${id}/emails/${emailId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return fail(res.status, { error: extractApiError(resBody, "Failed to delete email") });
    }

    return { success: true };
  },

  addPhoneNumber: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = params.id;

    const payload = {
      phoneNumber: form.get("phoneNumber"),
      labelId: form.get("labelId") || undefined,
      hasWhatsapp: form.get("hasWhatsapp") === "on",
      isPrimary: form.get("isPrimary") === "on",
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/accounts/${id}/phone-numbers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return fail(res.status, { error: extractApiError(resBody, "Failed to add phone number") });
    }

    return { success: true };
  },

  deletePhoneNumber: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = params.id;
    const phoneId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/accounts/${id}/phone-numbers/${phoneId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return fail(res.status, { error: extractApiError(resBody, "Failed to delete phone number") });
    }

    return { success: true };
  },

  linkHuman: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = params.id;

    const payload = {
      humanId: form.get("humanId"),
      labelId: form.get("labelId") || undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/accounts/${id}/humans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return fail(res.status, { error: extractApiError(resBody, "Failed to link human") });
    }

    return { success: true };
  },

  unlinkHuman: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = params.id;
    const linkId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/accounts/${id}/humans/${linkId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return fail(res.status, { error: extractApiError(resBody, "Failed to unlink human") });
    }

    return { success: true };
  },

  updateHumanLabel: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = params.id;
    const linkId = form.get("linkId");
    const labelId = form.get("labelId") || null;

    const res = await fetch(`${PUBLIC_API_URL}/api/accounts/${id}/humans/${linkId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify({ labelId }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return fail(res.status, { error: extractApiError(resBody, "Failed to update label") });
    }

    return { success: true };
  },

  createAndLinkHuman: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = params.id;

    const firstName = form.get("firstName") as string;
    const lastName = form.get("lastName") as string;
    const labelId = form.get("labelId") || undefined;

    // Create the human
    const createRes = await fetch(`${PUBLIC_API_URL}/api/humans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify({ firstName, lastName }),
    });

    if (!createRes.ok) {
      const resBody: unknown = await createRes.json().catch(() => ({}));
      return fail(createRes.status, { error: extractApiError(resBody, "Failed to create human") });
    }

    const createData: unknown = await createRes.json();
    const humanId = (createData as { data?: { id?: string } })?.data?.id;
    if (!humanId) {
      return fail(500, { error: "Failed to get created human ID" });
    }

    // Link the human to this account
    const linkRes = await fetch(`${PUBLIC_API_URL}/api/accounts/${id}/humans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify({ humanId, labelId }),
    });

    if (!linkRes.ok) {
      const resBody: unknown = await linkRes.json().catch(() => ({}));
      return fail(linkRes.status, { error: extractApiError(resBody, "Failed to link human to account") });
    }

    return { success: true };
  },

  addActivity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";

    const payload = {
      type: form.get("type") || "email",
      subject: form.get("subject"),
      notes: form.get("notes") || undefined,
      activityDate: (() => { const v = form.get("activityDate") as string; return v ? new Date(v).toISOString() : new Date().toISOString(); })(),
      accountId: params.id,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return fail(res.status, { error: extractApiError(resBody, "Failed to create activity") });
    }

    return { success: true };
  },
};
