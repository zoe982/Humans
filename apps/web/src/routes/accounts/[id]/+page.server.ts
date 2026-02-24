import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, failFromApi, fetchConfigs, authHeaders } from "$lib/server/api";

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

  const headers = authHeaders(sessionToken);
  async function fetchList(url: string): Promise<unknown[]> {
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const raw: unknown = await res.json();
    return isListData(raw) ? raw.data : [];
  }

  // Batch: all configs + humans + discount codes in one batch
  const [configs, allHumans, allDiscountCodes] = await Promise.all([
    fetchConfigs(sessionToken, ["account-types", "account-human-labels", "account-email-labels", "account-phone-labels", "social-id-platforms"]),
    fetchList(`${PUBLIC_API_URL}/api/humans`),
    fetchList(`${PUBLIC_API_URL}/api/discount-codes`),
  ]);

  return {
    account,
    typeConfigs: configs["account-types"] ?? [],
    humanLabelConfigs: configs["account-human-labels"] ?? [],
    emailLabelConfigs: configs["account-email-labels"] ?? [],
    phoneLabelConfigs: configs["account-phone-labels"] ?? [],
    allHumans,
    socialIdPlatformConfigs: configs["social-id-platforms"] ?? [],
    allDiscountCodes,
  };
};

export const actions = {
  addEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
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
      return failFromApi(resBody, res.status, "Failed to add email");
    }

    return { success: true };
  },

  deleteEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
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
      return failFromApi(resBody, res.status, "Failed to delete email");
    }

    return { success: true };
  },

  addPhoneNumber: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
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
      return failFromApi(resBody, res.status, "Failed to add phone number");
    }

    return { success: true };
  },

  deletePhoneNumber: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
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
      return failFromApi(resBody, res.status, "Failed to delete phone number");
    }

    return { success: true };
  },

  linkHuman: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
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
      return failFromApi(resBody, res.status, "Failed to link human");
    }

    return { success: true };
  },

  unlinkHuman: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
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
      return failFromApi(resBody, res.status, "Failed to unlink human");
    }

    return { success: true };
  },

  updateHumanLabel: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
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
      return failFromApi(resBody, res.status, "Failed to update label");
    }

    return { success: true };
  },

  createAndLinkHuman: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
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
      return failFromApi(resBody, createRes.status, "Failed to create human");
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
      return failFromApi(resBody, linkRes.status, "Failed to link human to account");
    }

    return { success: true };
  },

  addSocialId: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";

    const payload = {
      handle: form.get("handle"),
      platformId: form.get("platformId") || undefined,
      accountId: params.id,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/social-ids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to add social ID");
    }

    return { success: true };
  },

  deleteSocialId: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const socialIdId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/social-ids/${socialIdId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to delete social ID");
    }

    return { success: true };
  },

  addWebsite: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";

    const payload = {
      url: form.get("url"),
      accountId: params.id,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/websites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to add website");
    }

    return { success: true };
  },

  deleteWebsite: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const websiteId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/websites/${websiteId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to delete website");
    }

    return { success: true };
  },

  addReferralCode: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";

    const payload = {
      code: form.get("code"),
      description: form.get("description") || undefined,
      accountId: params.id,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/referral-codes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to add referral code");
    }

    return { success: true };
  },

  deleteReferralCode: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const referralCodeId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/referral-codes/${referralCodeId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to delete referral code");
    }

    return { success: true };
  },

  linkDiscountCode: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const discountCodeId = form.get("discountCodeId");

    const res = await fetch(`${PUBLIC_API_URL}/api/discount-codes/${discountCodeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify({ accountId: params.id }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to link discount code");
    }

    return { success: true };
  },

  unlinkDiscountCode: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const discountCodeId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/discount-codes/${discountCodeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify({ accountId: null }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to unlink discount code");
    }

    return { success: true };
  },

  addActivity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
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
      return failFromApi(resBody, res.status, "Failed to create activity");
    }

    return { success: true };
  },
};
