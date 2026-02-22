import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiErrorInfo } from "$lib/api";

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

function failFromApi(resBody: unknown, status: number, fallback: string): ActionFailure<{ error: string; code?: string; requestId?: string }> {
  const info = extractApiErrorInfo(resBody, fallback);
  return fail(status, { error: info.message, code: info.code, requestId: info.requestId });
}

const CONFIG_TYPES = ["account-types", "account-human-labels", "account-email-labels", "account-phone-labels", "human-email-labels", "human-phone-labels", "opportunity-human-roles"] as const;

async function fetchConfig(sessionToken: string, configType: string) {
  const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/${configType}`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });
  if (!res.ok) return [];
  const raw: unknown = await res.json();
  return isListData(raw) ? raw.data : [];
}

export const load = async ({ locals, cookies }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");
  if (locals.user.role !== "admin") redirect(302, "/dashboard");

  const sessionToken = cookies.get("humans_session") ?? "";

  const [accountTypes, humanLabels, emailLabels, phoneLabels, humanEmailLabels, humanPhoneLabels, opportunityHumanRoles] = await Promise.all(
    CONFIG_TYPES.map((type) => fetchConfig(sessionToken, type)),
  );

  return { accountTypes, humanLabels, emailLabels, phoneLabels, humanEmailLabels, humanPhoneLabels, opportunityHumanRoles };
};

export const actions = {
  createAccountType: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const name = form.get("name") as string;

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
    const id = form.get("id") as string;

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
    const name = form.get("name") as string;

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
    const id = form.get("id") as string;

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
    const name = form.get("name") as string;

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
    const id = form.get("id") as string;

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
    const name = form.get("name") as string;

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
    const id = form.get("id") as string;

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
    const name = form.get("name") as string;

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
    const id = form.get("id") as string;

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
    const name = form.get("name") as string;

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
    const id = form.get("id") as string;

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
    const name = form.get("name") as string;

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
    const id = form.get("id") as string;

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
};
