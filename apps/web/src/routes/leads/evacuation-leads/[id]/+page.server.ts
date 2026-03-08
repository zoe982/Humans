import { redirect } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, failFromApi, fetchConfigs, authHeaders, fetchList, fetchObj } from "$lib/server/api";

function getFormString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ evacuationLead: unknown; activities: unknown[]; colleagues: unknown[]; linkedHuman: unknown; marketingAttribution: unknown; leadScore: Record<string, unknown> | null; emails: unknown[]; phoneNumbers: unknown[]; socialIds: unknown[]; platformConfigs: unknown[]; leadSources: unknown[]; leadChannels: unknown[]; lossReasons: unknown[]; user: NonNullable<typeof locals.user> }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id;

  // Fetch single evacuation lead
  const leadRes = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${id ?? ""}`, {
    headers: authHeaders(sessionToken),
  });

  if (!leadRes.ok) redirect(302, "/leads/evacuation-leads");
  const leadRaw: unknown = await leadRes.json();
  const evacuationLead = isObjData(leadRaw) ? leadRaw.data : null;
  if (evacuationLead == null) redirect(302, "/leads/evacuation-leads");

  const marketingAttributionId = typeof evacuationLead["marketing_attribution_id"] === "string" ? evacuationLead["marketing_attribution_id"] : null;

  // Batch 1 (4 concurrent)
  const [activities, colleagues, leadScore, linkedHumanObj] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/activities?evacuationLeadId=${id ?? ""}&include=linkedEntities`, sessionToken),
    fetchList(`${PUBLIC_API_URL}/api/colleagues`, sessionToken),
    fetchObj(`${PUBLIC_API_URL}/api/lead-scores/by-parent/evacuation_lead/${id ?? ""}`, sessionToken),
    fetchObj(`${PUBLIC_API_URL}/api/evacuation-leads/${id ?? ""}/linked-human`, sessionToken),
  ]);

  const linkedHuman = linkedHumanObj ?? null;

  // Batch 2a
  const [emails] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/evacuation-leads/${id ?? ""}/emails`, sessionToken),
  ]);

  // Batch 2 (3 concurrent)
  const [phoneNumbers, socialIds, configs] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/evacuation-leads/${id ?? ""}/phone-numbers`, sessionToken),
    fetchList(`${PUBLIC_API_URL}/api/evacuation-leads/${id ?? ""}/social-ids`, sessionToken),
    fetchConfigs(sessionToken, ["social-id-platforms", "lead-sources", "lead-channels", "loss-reasons"]),
  ]);

  // Sequential: marketing attribution (optional)
  const marketingAttribution = marketingAttributionId != null
    ? await fetchObj(`${PUBLIC_API_URL}/api/marketing-attributions/${marketingAttributionId}`, sessionToken)
    : null;

  return { evacuationLead, activities, colleagues, linkedHuman, marketingAttribution, leadScore, emails, phoneNumbers, socialIds, platformConfigs: configs["social-id-platforms"] ?? [], leadSources: configs["lead-sources"] ?? [], leadChannels: configs["lead-channels"] ?? [], lossReasons: configs["loss-reasons"] ?? [], user: locals.user };
};

export const actions = {
  updateStatus: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const res = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${params.id ?? ""}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ status: form.get("status") }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to update status");
    }

    return { success: true };
  },

  updateNote: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const res = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${params.id ?? ""}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ note: form.get("note") }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to update note");
    }

    return { success: true };
  },

  updateSourceChannel: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const source = form.get("source");
    const channel = form.get("channel");

    const res = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${params.id ?? ""}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({
        crm_source: source === "" ? null : source,
        crm_channel: channel === "" ? null : channel,
      }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to update source/channel");
    }

    return { success: true };
  },

  delete: async ({ cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const sessionToken = cookies.get("humans_session");

    const res = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${params.id ?? ""}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete");
    }

    redirect(302, "/leads/evacuation-leads");
  },

  addActivity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const activityDateRaw = form.get("activityDate");
    const activityDate = activityDateRaw !== null && typeof activityDateRaw === "string" && activityDateRaw !== ""
      ? new Date(activityDateRaw).toISOString()
      : new Date().toISOString();
    const payload = {
      type: form.get("type") ?? "email",
      subject: form.get("subject"),
      notes: form.get("notes") ?? undefined,
      activityDate,
      evacuationLeadId: params.id,
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

  linkHuman: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const humanId = getFormString(form, "humanId");

    const res = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${params.id ?? ""}/link-human`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ humanId }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to link human");
    }

    return { success: true };
  },

  unlinkHuman: async ({ cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const sessionToken = cookies.get("humans_session");

    const res = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${params.id ?? ""}/link-human`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to unlink human");
    }

    return { success: true };
  },

  addEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string; details?: unknown }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const email = getFormString(form, "email");

    const res = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${id}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ email, evacuationLeadId: id }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add email");
    }

    return { success: true };
  },

  deleteEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const emailId = getFormString(form, "emailId");

    const res = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${id}/emails/${emailId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete email");
    }

    return { success: true };
  },

  addPhoneNumber: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string; details?: unknown }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const phoneNumber = getFormString(form, "phoneNumber");

    const res = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${id}/phone-numbers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ phoneNumber, evacuationLeadId: id }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add phone number");
    }

    return { success: true };
  },

  deletePhoneNumber: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const phoneNumberId = getFormString(form, "phoneNumberId");

    const res = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${id}/phone-numbers/${phoneNumberId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete phone number");
    }

    return { success: true };
  },

  addSocialId: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string; details?: unknown }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const handle = getFormString(form, "handle");
    const platformId = getFormString(form, "platformId");

    const payload: Record<string, string> = { handle, evacuationLeadId: id };
    if (platformId !== "") payload["platformId"] = platformId;

    const res = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${id}/social-ids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add social ID");
    }

    return { success: true };
  },

  deleteSocialId: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const socialIdId = getFormString(form, "socialIdId");

    const res = await fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${id}/social-ids/${socialIdId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete social ID");
    }

    return { success: true };
  },
};
