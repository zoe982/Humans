import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, failFromApi } from "$lib/server/api";

function formStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export function load({ locals, params }: RequestEvent): { accountId: string } {
  if (locals.user == null) redirect(302, "/login");
  return { accountId: params.id ?? "" };
}

export const actions = {
  addEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string; details?: unknown }> | { success: true }> => {
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

  addPhoneNumber: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string; details?: unknown }> | { success: true }> => {
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
    const humanIdRaw = isObjData(createData) && typeof createData.data["id"] === "string"
      ? createData.data["id"]
      : undefined;
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

  addSocialId: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string; details?: unknown }> | { success: true }> => {
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

  addWebsite: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string; details?: unknown }> | { success: true }> => {
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

  addAgreement: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";

    const typeIdVal = formStr(form.get("typeId"));
    const activationDateVal = formStr(form.get("activationDate"));
    const notesVal = formStr(form.get("notes"));

    const payload = {
      title: form.get("title"),
      typeId: typeIdVal !== "" ? typeIdVal : undefined,
      accountId: params.id,
      activationDate: activationDateVal !== "" ? activationDateVal : undefined,
      notes: notesVal !== "" ? notesVal : undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/agreements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    const resBody: unknown = await res.json().catch(() => ({}));

    if (!res.ok) {
      return failFromApi(resBody, res.status, "Failed to create agreement");
    }

    // Upload file if present
    const file = form.get("file");
    if (file instanceof File && file.size > 0 && isObjData(resBody)) {
      const agreementId = typeof resBody.data["id"] === "string" ? resBody.data["id"] : undefined;
      if (agreementId != null && agreementId !== "") {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        uploadForm.append("entityType", "agreement");
        uploadForm.append("entityId", agreementId);

        await fetch(`${PUBLIC_API_URL}/api/documents/upload`, {
          method: "POST",
          headers: { Cookie: `humans_session=${sessionToken}` },
          body: uploadForm,
        });
      }
    }

    return { success: true };
  },
};
