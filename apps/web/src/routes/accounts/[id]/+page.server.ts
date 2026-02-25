import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, failFromApi, fetchConfigs, authHeaders } from "$lib/server/api";

function formStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{
  account: Record<string, unknown>;
  typeConfigs: unknown[];
  humanLabelConfigs: unknown[];
  emailLabelConfigs: unknown[];
  phoneLabelConfigs: unknown[];
  allHumans: unknown[];
  socialIdPlatformConfigs: unknown[];
  allDiscountCodes: unknown[];
  accountAgreements: unknown[];
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";

  // SSR diagnostic: report timing to error endpoint
  const t0 = Date.now();
  let phase = "account-fetch";
  try {
    // Fetch account detail
    const accountRes = await fetch(`${PUBLIC_API_URL}/api/accounts/${id}`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    });
    const t1 = Date.now();

    if (!accountRes.ok) {
      void fetch(`${PUBLIC_API_URL}/api/client-errors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `SSR account-load: API ${accountRes.status}`, url: `/accounts/${id}`, errors: [{ type: "ssr", message: `status=${accountRes.status} elapsed=${t1 - t0}ms` }] }),
      }).catch(() => {});
      redirect(302, "/accounts");
    }
    const accountRaw: unknown = await accountRes.json();
    const account = isObjData(accountRaw) ? accountRaw.data : null;
    if (account == null) redirect(302, "/accounts");

    phase = "parallel-fetch";
    const headers = authHeaders(sessionToken);
    async function fetchList(url: string): Promise<unknown[]> {
      const res = await fetch(url, { headers });
      if (!res.ok) return [];
      const raw: unknown = await res.json();
      return isListData(raw) ? raw.data : [];
    }

    // Batch: all configs + humans + discount codes in one batch
    const [configs, allHumans, allDiscountCodes, accountAgreements] = await Promise.all([
      fetchConfigs(sessionToken, ["account-types", "account-human-labels", "account-email-labels", "account-phone-labels", "social-id-platforms"]),
      fetchList(`${PUBLIC_API_URL}/api/humans`),
      fetchList(`${PUBLIC_API_URL}/api/discount-codes`),
      fetchList(`${PUBLIC_API_URL}/api/agreements?accountId=${id}&limit=50`),
    ]);
    const t2 = Date.now();

    // Log success timing
    void fetch(`${PUBLIC_API_URL}/api/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `SSR account-load OK`, url: `/accounts/${id}`, errors: [{ type: "ssr-timing", message: `account=${t1 - t0}ms parallel=${t2 - t1}ms total=${t2 - t0}ms` }] }),
    }).catch(() => {});

    return {
      account,
      typeConfigs: configs["account-types"] ?? [],
      humanLabelConfigs: configs["account-human-labels"] ?? [],
      emailLabelConfigs: configs["account-email-labels"] ?? [],
      phoneLabelConfigs: configs["account-phone-labels"] ?? [],
      allHumans,
      socialIdPlatformConfigs: configs["social-id-platforms"] ?? [],
      allDiscountCodes,
      accountAgreements,
    };
  } catch (err) {
    // Re-throw redirects (SvelteKit Redirect is thrown as an exception)
    if (err != null && typeof err === "object" && "status" in err && "location" in err) throw err;

    const elapsed = Date.now() - t0;
    void fetch(`${PUBLIC_API_URL}/api/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `SSR account-load CRASH at ${phase}`, url: `/accounts/${id}`, errors: [{ type: "ssr-error", message: `${err instanceof Error ? err.message : String(err)} elapsed=${elapsed}ms`, stack: err instanceof Error ? err.stack ?? "" : "" }] }),
    }).catch(() => {});
    throw err;
  }
};

export const actions = {
  addEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = params.id ?? "";

    const labelIdVal = formStr(form.get("labelId"));
    const payload = {
      email: form.get("email"),
      labelId: labelIdVal !== "" ? labelIdVal : undefined,
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
    const id = params.id ?? "";
    const emailId = formStr(form.get("id"));

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
    const id = params.id ?? "";

    const labelIdVal = formStr(form.get("labelId"));
    const payload = {
      phoneNumber: form.get("phoneNumber"),
      labelId: labelIdVal !== "" ? labelIdVal : undefined,
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
    const id = params.id ?? "";
    const phoneId = formStr(form.get("id"));

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
    const id = params.id ?? "";

    const labelIdVal = formStr(form.get("labelId"));
    const payload = {
      humanId: form.get("humanId"),
      labelId: labelIdVal !== "" ? labelIdVal : undefined,
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
    const id = params.id ?? "";
    const linkId = formStr(form.get("id"));

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
    const id = params.id ?? "";
    const linkId = formStr(form.get("linkId"));
    const labelIdVal = formStr(form.get("labelId"));
    const labelId = labelIdVal !== "" ? labelIdVal : null;

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
    const id = params.id ?? "";

    const firstName = formStr(form.get("firstName"));
    const lastName = formStr(form.get("lastName"));
    const labelIdVal = formStr(form.get("labelId"));
    const labelId = labelIdVal !== "" ? labelIdVal : undefined;

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
    const humanIdRaw = isObjData(createData) ? (createData.data as { id?: string }).id : undefined;
    const humanId = humanIdRaw != null && humanIdRaw !== "" ? humanIdRaw : null;
    if (humanId == null) {
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

    const platformIdVal = formStr(form.get("platformId"));
    const payload = {
      handle: form.get("handle"),
      platformId: platformIdVal !== "" ? platformIdVal : undefined,
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
    const socialIdId = formStr(form.get("id"));

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
    const websiteId = formStr(form.get("id"));

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

    const descriptionVal = formStr(form.get("description"));
    const payload = {
      code: form.get("code"),
      description: descriptionVal !== "" ? descriptionVal : undefined,
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
    const referralCodeId = formStr(form.get("id"));

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
    const discountCodeId = formStr(form.get("discountCodeId"));

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
    const discountCodeId = formStr(form.get("id"));

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

    const typeVal = formStr(form.get("type"));
    const notesVal = formStr(form.get("notes"));
    const activityDateVal = formStr(form.get("activityDate"));
    const payload = {
      type: typeVal !== "" ? typeVal : "email",
      subject: form.get("subject"),
      notes: notesVal !== "" ? notesVal : undefined,
      activityDate: activityDateVal !== "" ? new Date(activityDateVal).toISOString() : new Date().toISOString(),
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
