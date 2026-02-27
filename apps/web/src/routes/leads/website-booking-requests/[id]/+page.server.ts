import { redirect } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, failFromApi, fetchConfigs, authHeaders, fetchList as sharedFetchList, fetchObj as sharedFetchObj } from "$lib/server/api";

function isConfigsRecord(value: unknown): value is Record<string, unknown[]> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getFormString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ booking: unknown; activities: unknown[]; colleagues: unknown[]; linkedHumans: unknown[]; marketingAttribution: unknown; leadScore: Record<string, unknown> | null; emails: unknown[]; phoneNumbers: unknown[]; socialIds: unknown[]; platformConfigs: unknown[]; leadSources: unknown[]; leadChannels: unknown[]; user: NonNullable<typeof locals.user> }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id;

  // Fetch single booking request
  const bookingRes = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${id ?? ""}`, {
    headers: authHeaders(sessionToken),
  });

  if (!bookingRes.ok) redirect(302, "/leads/website-booking-requests");
  const bookingRaw: unknown = await bookingRes.json();
  const booking = isObjData(bookingRaw) ? bookingRaw.data : null;
  if (booking == null) redirect(302, "/leads/website-booking-requests");

  const fetchList = async (url: string): Promise<unknown[]> => sharedFetchList(url, sessionToken);
  const fetchObj = async (url: string): Promise<Record<string, unknown> | null> => sharedFetchObj(url, sessionToken);

  const marketingAttributionId = typeof booking["marketing_attribution_id"] === "string" ? booking["marketing_attribution_id"] : null;

  // Batch 1 (3 fetches — each consumes body immediately, freeing the connection)
  const [activities, colleagues, linkedHumans] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/activities?websiteBookingRequestId=${id ?? ""}&include=linkedEntities`),
    fetchList(`${PUBLIC_API_URL}/api/colleagues`),
    fetchList(`${PUBLIC_API_URL}/api/website-booking-requests/${id ?? ""}/linked-humans`),
  ]);

  // Batch 2 (3 fetches)
  const [leadScore, emails, phoneNumbers] = await Promise.all([
    fetchObj(`${PUBLIC_API_URL}/api/lead-scores/by-parent/website_booking_request/${id ?? ""}`),
    fetchList(`${PUBLIC_API_URL}/api/website-booking-requests/${id ?? ""}/emails`),
    fetchList(`${PUBLIC_API_URL}/api/website-booking-requests/${id ?? ""}/phone-numbers`),
  ]);

  // Batch 3 (2-3 fetches)
  const batch3: Promise<unknown>[] = [
    fetchList(`${PUBLIC_API_URL}/api/website-booking-requests/${id ?? ""}/social-ids`),
    fetchConfigs(sessionToken, ["social-id-platforms", "lead-sources", "lead-channels"]),
  ];
  if (marketingAttributionId != null) {
    batch3.push(fetchObj(`${PUBLIC_API_URL}/api/marketing-attributions/${marketingAttributionId}`));
  }
  const [socialIdsResult, configsResult, attrResult] = await Promise.all(batch3);
  const socialIds = Array.isArray(socialIdsResult) ? socialIdsResult : [];
  const configs = isConfigsRecord(configsResult) ? configsResult : {};
  const marketingAttribution = attrResult ?? null;

  return { booking, activities, colleagues, linkedHumans, marketingAttribution, leadScore, emails, phoneNumbers, socialIds, platformConfigs: configs["social-id-platforms"] ?? [], leadSources: configs["lead-sources"] ?? [], leadChannels: configs["lead-channels"] ?? [], user: locals.user };
};

export const actions = {
  updateStatus: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const status = getFormString(form, "status");

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${params.id ?? ""}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ status }),
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

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${params.id ?? ""}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ crm_note: form.get("crm_note") }),
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

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${params.id ?? ""}`, {
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

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${params.id ?? ""}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete");
    }

    redirect(302, "/leads/website-booking-requests");
  },

  addActivity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const payload = {
      type: form.get("type") ?? "email",
      subject: form.get("subject"),
      notes: form.get("notes") ?? undefined,
      activityDate: form.get("activityDate") ?? new Date().toISOString(),
      websiteBookingRequestId: params.id,
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

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${params.id ?? ""}/link-human`, {
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

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${params.id ?? ""}/link-human`, {
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

  addEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const email = getFormString(form, "email");

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${id}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ email, websiteBookingRequestId: id }),
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

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${id}/emails/${emailId}`, {
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
    const phoneNumber = getFormString(form, "phoneNumber");

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${id}/phone-numbers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ phoneNumber, websiteBookingRequestId: id }),
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

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${id}/phone-numbers/${phoneNumberId}`, {
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
    const handle = getFormString(form, "handle");
    const platformId = getFormString(form, "platformId");

    const payload: Record<string, string> = { handle, websiteBookingRequestId: id };
    if (platformId !== "") payload["platformId"] = platformId;

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${id}/social-ids`, {
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

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${id}/social-ids/${socialIdId}`, {
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
