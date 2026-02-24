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

  // Helper: fetch + consume body immediately to release connection
  // (Cloudflare Pages limits concurrent outbound connections to 6)
  const headers = { Cookie: `humans_session=${sessionToken ?? ""}` };
  async function fetchList(url: string): Promise<unknown[]> {
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const raw: unknown = await res.json();
    return isListData(raw) ? raw.data : [];
  }

  async function fetchObj(url: string): Promise<Record<string, unknown> | null> {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    return isObjData(raw) ? raw.data : null;
  }

  // Split into two batches to stay within Cloudflare's 6-connection limit
  const [colleagues, allHumans, roleConfigs, allPets, flightSummary] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/colleagues`),
    fetchList(`${PUBLIC_API_URL}/api/humans?limit=200`),
    fetchConfig(sessionToken ?? "", "opportunity-human-roles"),
    fetchList(`${PUBLIC_API_URL}/api/pets`),
    fetchList(`${PUBLIC_API_URL}/api/flights/summary`),
  ]);

  const [bookingRequestsRaw, cadenceConfigs] = await Promise.all([
    fetchObj(`${PUBLIC_API_URL}/api/opportunities/${id}/booking-requests`),
    fetchList(`${PUBLIC_API_URL}/api/opportunity-cadence`),
  ]);

  const bookingRequests = bookingRequestsRaw
    ? { linked: (bookingRequestsRaw as { linked?: unknown[]; available?: unknown[] }).linked ?? [], available: (bookingRequestsRaw as { linked?: unknown[]; available?: unknown[] }).available ?? [] }
    : { linked: [] as unknown[], available: [] as unknown[] };

  return {
    opportunity,
    colleagues,
    allHumans,
    allPets,
    roleConfigs,
    flightSummary,
    bookingRequests,
    cadenceConfigs,
    apiUrl: PUBLIC_API_URL,
    userRole: locals.user?.role ?? "viewer",
    currentColleagueId: locals.user?.id ?? null,
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

  linkFlight: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id;
    const flightId = form.get("flightId");

    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities/${id}/flight`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ flightId }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to link flight");
    }

    return { success: true };
  },

  unlinkFlight: async ({ cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const sessionToken = cookies.get("humans_session");
    const id = params.id;

    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities/${id}/flight`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to unlink flight");
    }

    return { success: true };
  },

  linkBookingRequest: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id;
    const bookingRequestLinkId = form.get("bookingRequestLinkId");

    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities/${id}/booking-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ bookingRequestLinkId }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to link booking request");
    }

    return { success: true };
  },

  unlinkBookingRequest: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id;
    const linkId = form.get("linkId");

    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities/${id}/booking-requests/${linkId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to unlink booking request");
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
