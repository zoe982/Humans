import { redirect } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, failFromApi, fetchConfigs, authHeaders } from "$lib/server/api";

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

  // Build parallel fetch list: activities, colleagues, linked humans, emails, phones, social-ids, and optionally attribution
  const marketingAttributionId = typeof booking["marketing_attribution_id"] === "string" ? booking["marketing_attribution_id"] : null;

  const headers = authHeaders(sessionToken);
  const parallelFetches: Promise<Response>[] = [
    fetch(`${PUBLIC_API_URL}/api/activities?websiteBookingRequestId=${id ?? ""}&include=linkedEntities`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/colleagues`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${id ?? ""}/linked-humans`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/lead-scores/by-parent/website_booking_request/${id ?? ""}`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${id ?? ""}/emails`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${id ?? ""}/phone-numbers`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${id ?? ""}/social-ids`, { headers }),
  ];
  if (marketingAttributionId != null) {
    parallelFetches.push(
      fetch(`${PUBLIC_API_URL}/api/marketing-attributions/${marketingAttributionId}`, { headers }),
    );
  }
  const [activitiesRes, colleaguesRes, linkedHumansRes, leadScoreRes, emailsRes, phoneNumbersRes, socialIdsRes, attributionRes] = await Promise.all(parallelFetches);

  let activities: unknown[] = [];
  if (activitiesRes.ok) {
    const activitiesRaw: unknown = await activitiesRes.json();
    activities = isListData(activitiesRaw) ? activitiesRaw.data : [];
  }

  let colleagues: unknown[] = [];
  if (colleaguesRes.ok) {
    const colleaguesRaw: unknown = await colleaguesRes.json();
    colleagues = isListData(colleaguesRaw) ? colleaguesRaw.data : [];
  }

  let linkedHumans: unknown[] = [];
  if (linkedHumansRes.ok) {
    const linkedHumansRaw: unknown = await linkedHumansRes.json();
    linkedHumans = isListData(linkedHumansRaw) ? linkedHumansRaw.data : [];
  }

  let leadScore: Record<string, unknown> | null = null;
  if (leadScoreRes.ok) {
    const lsRaw: unknown = await leadScoreRes.json();
    leadScore = isObjData(lsRaw) ? lsRaw.data : null;
  }

  let emails: unknown[] = [];
  if (emailsRes.ok) {
    const emailsRaw: unknown = await emailsRes.json();
    emails = isListData(emailsRaw) ? emailsRaw.data : [];
  }

  let phoneNumbers: unknown[] = [];
  if (phoneNumbersRes.ok) {
    const phoneNumbersRaw: unknown = await phoneNumbersRes.json();
    phoneNumbers = isListData(phoneNumbersRaw) ? phoneNumbersRaw.data : [];
  }

  let socialIds: unknown[] = [];
  if (socialIdsRes.ok) {
    const socialIdsRaw: unknown = await socialIdsRes.json();
    socialIds = isListData(socialIdsRaw) ? socialIdsRaw.data : [];
  }

  let marketingAttribution: unknown = null;
  if (attributionRes?.ok === true) {
    const attrRaw: unknown = await attributionRes.json();
    marketingAttribution = isObjData(attrRaw) ? attrRaw.data : null;
  }

  const configs = await fetchConfigs(sessionToken, ["social-id-platforms", "lead-sources", "lead-channels"]);

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

  convertToHuman: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const humanId = getFormString(form, "humanId");

    const res = await fetch(`${PUBLIC_API_URL}/api/humans/${humanId}/convert-from-booking-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ websiteBookingRequestId: params.id }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to convert");
    }

    return { success: true };
  },

  unlinkHuman: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const humanId = getFormString(form, "humanId");
    const linkId = getFormString(form, "linkId");

    const res = await fetch(`${PUBLIC_API_URL}/api/humans/${humanId}/website-booking-requests/${linkId}`, {
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
