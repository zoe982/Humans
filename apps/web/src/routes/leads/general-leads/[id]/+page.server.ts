import { redirect } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, failFromApi, fetchConfigs, authHeaders, fetchList, fetchObj } from "$lib/server/api";
import { generalLeadDetailSchema, type GeneralLeadDetail } from "@humans/shared";

function formStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{
  lead: GeneralLeadDetail;
  activities: unknown[];
  user: { id: string; email: string; role: string; name: string };
  allHumans: unknown[];
  colleagues: unknown[];
  leadScore: Record<string, unknown> | null;
  platformConfigs: unknown[];
  leadSources: unknown[];
  leadChannels: unknown[];
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";

  const lead = await fetchObj(`${PUBLIC_API_URL}/api/general-leads/${id}`, sessionToken, {
    schema: generalLeadDetailSchema,
    schemaName: "generalLeadDetail",
  });
  if (lead == null) redirect(302, "/leads/general-leads");

  const [allHumans, colleagues, leadScoreRes, activities, configs] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/humans?limit=200`, sessionToken),
    fetchList(`${PUBLIC_API_URL}/api/colleagues`, sessionToken),
    fetch(`${PUBLIC_API_URL}/api/lead-scores/by-parent/general_lead/${id}`, { headers: authHeaders(sessionToken) }),
    fetchList(`${PUBLIC_API_URL}/api/activities?generalLeadId=${id}&include=linkedEntities`, sessionToken),
    fetchConfigs(sessionToken, ["social-id-platforms", "lead-sources", "lead-channels"]),
  ]);

  let leadScore: Record<string, unknown> | null = null;
  if (leadScoreRes.ok) {
    const raw: unknown = await leadScoreRes.json();
    leadScore = isObjData(raw) ? (raw.data as Record<string, unknown> | null) : null;
  }

  return { lead, activities, user: locals.user, allHumans, colleagues, leadScore, platformConfigs: configs["social-id-platforms"] ?? [], leadSources: configs["lead-sources"] ?? [], leadChannels: configs["lead-channels"] ?? [] };
};

export const actions = {
  updateNotes: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ notes: form.get("notes") }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to update notes");
    }

    return { success: true };
  },

  addEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const email = formStr(form.get("email"));

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${id}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ email, generalLeadId: id }),
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
    const emailId = formStr(form.get("emailId"));

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${id}/emails/${emailId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete email");
    }

    return { success: true };
  },

  addPhoneNumber: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const phoneNumber = formStr(form.get("phoneNumber"));

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${id}/phone-numbers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ phoneNumber, generalLeadId: id }),
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
    const phoneNumberId = formStr(form.get("phoneNumberId"));

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${id}/phone-numbers/${phoneNumberId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete phone number");
    }

    return { success: true };
  },

  addSocialId: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const handle = formStr(form.get("handle"));
    const platformId = formStr(form.get("platformId"));

    const payload: Record<string, string> = { handle, generalLeadId: id };
    if (platformId !== "") payload["platformId"] = platformId;

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${id}/social-ids`, {
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
    const socialIdId = formStr(form.get("socialIdId"));

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${id}/social-ids/${socialIdId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete social ID");
    }

    return { success: true };
  },

  updateStatus: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const status = formStr(form.get("status"));
    const rejectReasonVal = form.get("rejectReason");
    const rejectReason = typeof rejectReasonVal === "string" && rejectReasonVal !== "" ? rejectReasonVal : null;

    const payload: Record<string, string> = { status };
    if (rejectReason != null) payload["rejectReason"] = rejectReason;

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to update status");
    }

    return { success: true };
  },

  addActivity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";

    const typeVal = formStr(form.get("type"));
    const notesVal = formStr(form.get("notes"));
    const activityDateVal = formStr(form.get("activityDate"));
    const payload = {
      type: typeVal !== "" ? typeVal : "email",
      subject: form.get("subject"),
      notes: notesVal !== "" ? notesVal : undefined,
      activityDate: activityDateVal !== "" ? activityDateVal : new Date().toISOString(),
      generalLeadId: id,
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


  updateSourceChannel: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const source = form.get("source");
    const channel = form.get("channel");

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({
        source: source === "" ? null : source,
        channel: channel === "" ? null : channel,
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
    const id = params.id ?? "";

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete");
    }

    redirect(302, "/leads/general-leads");
  },
};
