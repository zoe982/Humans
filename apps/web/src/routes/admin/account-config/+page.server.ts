import { redirect } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { fetchConfigs, failFromApi } from "$lib/server/api";

function getFormString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

export const load = async ({ locals, cookies }: RequestEvent): Promise<{
  accountTypes: unknown[];
  humanLabels: unknown[];
  emailLabels: unknown[];
  phoneLabels: unknown[];
  humanEmailLabels: unknown[];
  humanPhoneLabels: unknown[];
  opportunityHumanRoles: unknown[];
  humanRelationshipLabels: unknown[];
  agreementTypes: unknown[];
}> => {
  if (locals.user == null) redirect(302, "/login");
  if (locals.user.role !== "admin") redirect(302, "/dashboard");

  const sessionToken = cookies.get("humans_session") ?? "";

  const configs = await fetchConfigs(sessionToken);

  return {
    accountTypes: configs["account-types"] ?? [],
    humanLabels: configs["account-human-labels"] ?? [],
    emailLabels: configs["account-email-labels"] ?? [],
    phoneLabels: configs["account-phone-labels"] ?? [],
    humanEmailLabels: configs["human-email-labels"] ?? [],
    humanPhoneLabels: configs["human-phone-labels"] ?? [],
    opportunityHumanRoles: configs["opportunity-human-roles"] ?? [],
    humanRelationshipLabels: configs["human-relationship-labels"] ?? [],
    agreementTypes: configs["agreement-types"] ?? [],
  };
};

export const actions = {
  createAccountType: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const name = getFormString(form, "name");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `humans_session=${sessionToken}` },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to create");
    }
    return { success: true };
  },

  deleteAccountType: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = getFormString(form, "id");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-types/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to delete");
    }
    return { success: true };
  },

  createHumanLabel: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const name = getFormString(form, "name");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-human-labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `humans_session=${sessionToken}` },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to create");
    }
    return { success: true };
  },

  deleteHumanLabel: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = getFormString(form, "id");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-human-labels/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to delete");
    }
    return { success: true };
  },

  createEmailLabel: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const name = getFormString(form, "name");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-email-labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `humans_session=${sessionToken}` },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to create");
    }
    return { success: true };
  },

  deleteEmailLabel: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = getFormString(form, "id");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-email-labels/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to delete");
    }
    return { success: true };
  },

  createPhoneLabel: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const name = getFormString(form, "name");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-phone-labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `humans_session=${sessionToken}` },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to create");
    }
    return { success: true };
  },

  deletePhoneLabel: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = getFormString(form, "id");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-phone-labels/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to delete");
    }
    return { success: true };
  },

  createHumanEmailLabel: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const name = getFormString(form, "name");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/human-email-labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `humans_session=${sessionToken}` },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to create");
    }
    return { success: true };
  },

  deleteHumanEmailLabel: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = getFormString(form, "id");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/human-email-labels/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to delete");
    }
    return { success: true };
  },

  createHumanPhoneLabel: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const name = getFormString(form, "name");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/human-phone-labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `humans_session=${sessionToken}` },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to create");
    }
    return { success: true };
  },

  deleteHumanPhoneLabel: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = getFormString(form, "id");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/human-phone-labels/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to delete");
    }
    return { success: true };
  },

  createOpportunityHumanRole: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const name = getFormString(form, "name");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/opportunity-human-roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `humans_session=${sessionToken}` },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to create");
    }
    return { success: true };
  },

  deleteOpportunityHumanRole: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = getFormString(form, "id");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/opportunity-human-roles/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to delete");
    }
    return { success: true };
  },

  createHumanRelationshipLabel: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const name = getFormString(form, "name");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/human-relationship-labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `humans_session=${sessionToken}` },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to create");
    }
    return { success: true };
  },

  deleteHumanRelationshipLabel: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = getFormString(form, "id");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/human-relationship-labels/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to delete");
    }
    return { success: true };
  },

  createAgreementType: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const name = getFormString(form, "name");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/agreement-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `humans_session=${sessionToken}` },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to create");
    }
    return { success: true };
  },

  deleteAgreementType: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const id = getFormString(form, "id");

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/agreement-types/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to delete");
    }
    return { success: true };
  },
};
