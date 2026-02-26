import { redirect } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { failFromApi, fetchConfigs, fetchList, fetchObj } from "$lib/server/api";
import { opportunityDetailSchema, type OpportunityDetail } from "@humans/shared";

function formStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{
  opportunity: OpportunityDetail;
  colleagues: unknown[];
  allHumans: unknown[];
  allPets: unknown[];
  roleConfigs: unknown[];
  flightSummary: unknown[];
  bookingRequests: { linked: unknown[]; available: unknown[] };
  cadenceConfigs: unknown[];
  apiUrl: string;
  userRole: string;
  currentColleagueId: string;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id ?? "";
  const token = sessionToken ?? "";

  const opportunity = await fetchObj(`${PUBLIC_API_URL}/api/opportunities/${id}`, token, {
    schema: opportunityDetailSchema,
    schemaName: "opportunityDetail",
  });
  if (opportunity == null) redirect(302, "/opportunities");

  // Batch: configs + data in one round
  const [configs, colleagues, allHumans, allPets, flightSummary] = await Promise.all([
    fetchConfigs(token, ["opportunity-human-roles"]),
    fetchList(`${PUBLIC_API_URL}/api/colleagues`, token),
    fetchList(`${PUBLIC_API_URL}/api/humans?limit=200`, token),
    fetchList(`${PUBLIC_API_URL}/api/pets`, token),
    fetchList(`${PUBLIC_API_URL}/api/flights/summary`, token),
  ]);

  const roleConfigs = configs["opportunity-human-roles"] ?? [];

  const [bookingRequestsRaw, cadenceConfigs] = await Promise.all([
    fetchObj(`${PUBLIC_API_URL}/api/opportunities/${id}/booking-requests`, token),
    fetchList(`${PUBLIC_API_URL}/api/opportunity-cadence`, token),
  ]) as [Record<string, unknown> | null, unknown[]];

  const bookingRequests = bookingRequestsRaw != null
    ? {
        linked: Array.isArray(bookingRequestsRaw["linked"]) ? bookingRequestsRaw["linked"] as unknown[] : [],
        available: Array.isArray(bookingRequestsRaw["available"]) ? bookingRequestsRaw["available"] as unknown[] : [],
      }
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
    userRole: locals.user.role,
    currentColleagueId: locals.user.id,
  };
};

export const actions = {
  linkHuman: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";

    const payload: Record<string, unknown> = {
      humanId: form.get("humanId"),
    };
    const roleId = formStr(form.get("roleId"));
    if (roleId !== "") payload.roleId = roleId;

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
    const id = params.id ?? "";
    const linkId = formStr(form.get("linkId"));

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
    const id = params.id ?? "";

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
    const id = params.id ?? "";
    const linkId = formStr(form.get("linkId"));

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
    const id = params.id ?? "";
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
    const id = params.id ?? "";

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
    const id = params.id ?? "";
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
    const id = params.id ?? "";
    const linkId = formStr(form.get("linkId"));

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

    const typeVal = formStr(form.get("type"));
    const notesVal = formStr(form.get("notes"));
    const activityDateVal = formStr(form.get("activityDate"));
    const payload = {
      type: typeVal !== "" ? typeVal : "email",
      subject: form.get("subject"),
      notes: notesVal !== "" ? notesVal : undefined,
      activityDate: activityDateVal !== "" ? new Date(activityDateVal).toISOString() : new Date().toISOString(),
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
