import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiErrorInfo } from "$lib/api";

function isObjData(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value;
}

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

async function fetchConfig(sessionToken: string, configType: string) {
  const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/${configType}`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });
  if (!res.ok) return [];
  const raw: unknown = await res.json();
  return isListData(raw) ? raw.data : [];
}

function failFromApi(resBody: unknown, status: number, fallback: string): ActionFailure<{ error: string; code?: string; requestId?: string }> {
  const info = extractApiErrorInfo(resBody, fallback);
  return fail(status, { error: info.message, code: info.code, requestId: info.requestId });
}

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id;

  const oppRes = await fetch(`${PUBLIC_API_URL}/api/opportunities/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!oppRes.ok) redirect(302, "/opportunities");
  const oppRaw: unknown = await oppRes.json();
  const opportunity = isObjData(oppRaw) ? oppRaw.data : null;
  if (opportunity == null) redirect(302, "/opportunities");

  const headers = { Cookie: `humans_session=${sessionToken ?? ""}` };
  const [colleaguesRes, humansRes, roleConfigs] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/colleagues`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/humans?limit=200`, { headers }),
    fetchConfig(sessionToken ?? "", "opportunity-human-roles"),
  ]);

  let colleagues: unknown[] = [];
  if (colleaguesRes.ok) {
    const raw: unknown = await colleaguesRes.json();
    colleagues = isListData(raw) ? raw.data : [];
  }

  let allHumans: unknown[] = [];
  if (humansRes.ok) {
    const raw: unknown = await humansRes.json();
    allHumans = isListData(raw) ? raw.data : [];
  }

  return {
    opportunity,
    colleagues,
    allHumans,
    roleConfigs,
    apiUrl: PUBLIC_API_URL,
    userRole: locals.user?.role ?? "viewer",
  };
};

export const actions = {
  linkHuman: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id;

    const payload: Record<string, unknown> = {
      humanId: form.get("humanId"),
    };
    const roleId = form.get("roleId") as string;
    if (roleId) payload.roleId = roleId;

    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities/${id}/humans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to link human");
    }

    return { success: true };
  },

  unlinkHuman: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id;
    const linkId = form.get("linkId");

    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities/${id}/humans/${linkId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to unlink human");
    }

    return { success: true };
  },

  linkPet: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id;

    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities/${id}/pets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ petId: form.get("petId") }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to link pet");
    }

    return { success: true };
  },

  unlinkPet: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id;
    const linkId = form.get("linkId");

    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities/${id}/pets/${linkId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to unlink pet");
    }

    return { success: true };
  },

  addActivity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const payload = {
      type: form.get("type") || "email",
      subject: form.get("subject"),
      notes: form.get("notes") || undefined,
      activityDate: (() => { const v = form.get("activityDate") as string; return v ? new Date(v).toISOString() : new Date().toISOString(); })(),
      opportunityId: params.id,
    };

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
      return failFromApi(resBody, res.status, "Failed to create activity");
    }

    return { success: true };
  },
};
