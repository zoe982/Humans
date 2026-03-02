import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, failFromApi, fetchConfigs, authHeaders } from "$lib/server/api";

function formStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) return {};
  return Object.fromEntries(Object.entries(value));
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{
  human: Record<string, unknown>;
  activities: unknown[];
  apiUrl: string;
  emailLabelConfigs: unknown[];
  phoneLabelConfigs: unknown[];
  socialIdPlatformConfigs: unknown[];
  allRouteSignups: unknown[];
  allBookingRequests: unknown[];
  allAccounts: unknown[];
  accountHumanLabelConfigs: unknown[];
  convertedFromLead: { id: string; displayId: string } | null;
  generalLeads: unknown[];
  humanOpportunities: unknown[];
  allDiscountCodes: unknown[];
  humanRelationships: unknown[];
  humanRelationshipLabelConfigs: unknown[];
  allHumans: unknown[];
  humanAgreements: unknown[];
  agreementTypes: unknown[];
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id ?? "";
  const token = sessionToken ?? "";
  const headers = authHeaders(token);

  // Composite endpoint: human detail + activities + opportunities + generalLeads + relationships + agreements
  const fullRes = await fetch(`${PUBLIC_API_URL}/api/humans/${id}/full`, { headers });
  if (!fullRes.ok) redirect(302, "/humans");
  const fullRaw: unknown = await fullRes.json();
  const fullData = isObjData(fullRaw) ? fullRaw.data : null;
  if (fullData == null) redirect(302, "/humans");

  const humanRaw = fullData.human;
  if (typeof humanRaw !== "object" || humanRaw === null) redirect(302, "/humans");
  const human: Record<string, unknown> = Object.fromEntries(Object.entries(humanRaw));

  const activities = isListData(fullData.activities) ? fullData.activities.data : [];
  const humanOpportunities = isListData(fullData.opportunities) ? fullData.opportunities.data : [];
  const generalLeads = isListData(fullData.generalLeads) ? fullData.generalLeads.data : [];
  const humanRelationships = Array.isArray(fullData.relationships) ? fullData.relationships : [];
  const humanAgreements = isListData(fullData.agreements) ? fullData.agreements.data : [];

  // Helper: fetch + consume body immediately to release connection
  async function fetchList(url: string): Promise<unknown[]> {
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const raw: unknown = await res.json();
    return isListData(raw) ? raw.data : [];
  }

  // Parallel batch: configs + dropdown data + Supabase lists (route signups & booking requests)
  const [configs, dropdownRes, allRouteSignups, allBookingRequests] = await Promise.all([
    fetchConfigs(token, ["human-email-labels", "human-phone-labels", "social-id-platforms", "account-human-labels", "human-relationship-labels", "agreement-types"]),
    fetch(`${PUBLIC_API_URL}/api/ui/dropdown-data`, { headers }),
    fetchList(`${PUBLIC_API_URL}/api/route-signups?limit=100`),
    fetchList(`${PUBLIC_API_URL}/api/website-booking-requests?limit=100`),
  ]);

  const emailLabelConfigs = configs["human-email-labels"] ?? [];
  const phoneLabelConfigs = configs["human-phone-labels"] ?? [];
  const socialIdPlatformConfigs = configs["social-id-platforms"] ?? [];
  const accountHumanLabelConfigs = configs["account-human-labels"] ?? [];
  const humanRelationshipLabelConfigs = configs["human-relationship-labels"] ?? [];
  const agreementTypes = configs["agreement-types"] ?? [];

  // Extract dropdown data
  let allAccounts: unknown[] = [];
  let allHumans: unknown[] = [];
  let allDiscountCodes: unknown[] = [];
  if (dropdownRes.ok) {
    const dropdownRaw: unknown = await dropdownRes.json();
    if (isObjData(dropdownRaw)) {
      const dd = dropdownRaw.data;
      allAccounts = Array.isArray(dd.accounts) ? dd.accounts : [];
      allHumans = Array.isArray(dd.humans) ? dd.humans : [];
      allDiscountCodes = Array.isArray(dd.discountCodes) ? dd.discountCodes : [];
    }
  }

  // Derive convertedFromLead from the first general lead (backwards compat)
  const firstLead = generalLeads[0];
  const convertedFromLead = firstLead != null && typeof firstLead === "object" && "id" in firstLead && "displayId" in firstLead
    ? { id: String(firstLead.id), displayId: String(firstLead.displayId) }
    : null;

  // Enrich linked route signups with Supabase data
  interface SupabaseSignup { id: string; display_id?: string | null; first_name?: string | null; last_name?: string | null; origin?: string | null; destination?: string | null }
  interface LinkedRouteSignup { id: string; routeSignupId: string; linkedAt: string }
  interface LinkedBookingRequest { id: string; websiteBookingRequestId: string; linkedAt: string }
  function isLinkedRouteSignup(v: unknown): v is LinkedRouteSignup {
    return typeof v === "object" && v !== null && "id" in v && "routeSignupId" in v && "linkedAt" in v;
  }
  function isLinkedBookingRequest(v: unknown): v is LinkedBookingRequest {
    return typeof v === "object" && v !== null && "id" in v && "websiteBookingRequestId" in v && "linkedAt" in v;
  }
  const linkedRouteSignupsRaw = Array.isArray(human.linkedRouteSignups) ? human.linkedRouteSignups : [];
  const linkedBookingRequestsRaw = Array.isArray(human.linkedWebsiteBookingRequests) ? human.linkedWebsiteBookingRequests : [];
  function isSupabaseSignup(v: unknown): v is SupabaseSignup {
    return typeof v === "object" && v !== null && "id" in v;
  }

  // Fetch linked signups individually to avoid limit=100 miss
  async function fetchSignupById(signupId: string): Promise<SupabaseSignup | null> {
    const res = await fetch(`${PUBLIC_API_URL}/api/route-signups/${encodeURIComponent(signupId)}`, { headers });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    if (isObjData(raw) && isSupabaseSignup(raw.data)) return raw.data;
    return null;
  }

  const filteredLinkedSignups = linkedRouteSignupsRaw.filter(isLinkedRouteSignup);
  const signupResults = await Promise.all(
    filteredLinkedSignups.map(async (link) => {
      // Try bulk list first, fall back to individual fetch
      const cached = allRouteSignups.find((s) => isSupabaseSignup(s) && s.id === link.routeSignupId);
      if (isSupabaseSignup(cached)) return cached;
      return fetchSignupById(link.routeSignupId);
    }),
  );
  const enrichedLinkedSignups = filteredLinkedSignups.map((link, i) => {
    const signup = signupResults.at(i) ?? null;
    const joinedName = signup != null ? [signup.first_name, signup.last_name].filter(Boolean).join(" ") : "";
    return {
      ...link,
      displayId: signup?.display_id ?? null,
      passengerName: joinedName !== "" ? joinedName : null,
      origin: signup?.origin ?? null,
      destination: signup?.destination ?? null,
    };
  });

  // Enrich linked booking requests with Supabase data
  interface SupabaseBooking { id: string; crm_display_id?: string | null; first_name?: string | null; last_name?: string | null; origin_city?: string | null; destination_city?: string | null }
  function isSupabaseBooking(v: unknown): v is SupabaseBooking {
    return typeof v === "object" && v !== null && "id" in v;
  }

  // Fetch linked bookings individually to avoid limit=100 miss
  async function fetchBookingById(bookingId: string): Promise<SupabaseBooking | null> {
    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${encodeURIComponent(bookingId)}`, { headers });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    if (isObjData(raw) && isSupabaseBooking(raw.data)) return raw.data;
    return null;
  }

  const filteredLinkedBookings = linkedBookingRequestsRaw.filter(isLinkedBookingRequest);
  const bookingResults = await Promise.all(
    filteredLinkedBookings.map(async (link) => {
      const cached = allBookingRequests.find((b) => isSupabaseBooking(b) && b.id === link.websiteBookingRequestId);
      if (isSupabaseBooking(cached)) return cached;
      return fetchBookingById(link.websiteBookingRequestId);
    }),
  );
  const enrichedLinkedBookingRequests = filteredLinkedBookings.map((link, i) => {
    const booking = bookingResults.at(i) ?? null;
    const joinedName = booking != null ? [booking.first_name, booking.last_name].filter(Boolean).join(" ") : "";
    return {
      ...link,
      displayId: booking?.crm_display_id ?? null,
      passengerName: joinedName !== "" ? joinedName : null,
      originCity: booking?.origin_city ?? null,
      destinationCity: booking?.destination_city ?? null,
    };
  });

  return {
    human: {
      ...human,
      linkedRouteSignups: enrichedLinkedSignups,
      linkedWebsiteBookingRequests: enrichedLinkedBookingRequests,
    },
    activities,
    apiUrl: PUBLIC_API_URL,
    emailLabelConfigs,
    phoneLabelConfigs,
    socialIdPlatformConfigs,
    allRouteSignups,
    allBookingRequests,
    allAccounts,
    accountHumanLabelConfigs,
    convertedFromLead,
    generalLeads,
    humanOpportunities,
    allDiscountCodes,
    humanRelationships,
    humanRelationshipLabelConfigs,
    allHumans,
    humanAgreements,
    agreementTypes,
  };
};

export const actions = {
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
      humanId: params.id,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    const resBody: unknown = await res.json();

    if (!res.ok) {
      return failFromApi(resBody, res.status, "Failed to create activity");
    }

    let activityId: string | undefined;
    if (isObjData(resBody)) {
      activityId = typeof resBody.data.id === "string" ? resBody.data.id : undefined;
    }

    // Create geo-interest expressions from JSON array
    const geoInterestsRaw = formStr(form.get("geoInterestsJson")).trim();
    if (geoInterestsRaw !== "") {
      try {
        const geoParsed: unknown = JSON.parse(geoInterestsRaw);
        if (Array.isArray(geoParsed)) {
          for (const geoRaw of geoParsed) {
            const geo = toRecord(geoRaw);
            const geoId = typeof geo.id === "string" ? geo.id : "";
            const geoNotes = typeof geo.notes === "string" && geo.notes !== "" ? geo.notes : undefined;
            const geoPayload: Record<string, unknown> = {
              humanId: params.id,
              activityId,
              notes: geoNotes,
            };
            if (geoId !== "") {
              geoPayload.geoInterestId = geoId;
            } else {
              geoPayload.city = geo.city;
              geoPayload.country = geo.country;
            }
            await fetch(`${PUBLIC_API_URL}/api/geo-interest-expressions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Cookie: `humans_session=${sessionToken ?? ""}`,
              },
              body: JSON.stringify(geoPayload),
            });
          }
        }
      } catch { /* ignore malformed JSON */ }
    }

    // Create route-interest expressions from JSON array
    const routeInterestsRaw = formStr(form.get("routeInterestsJson")).trim();
    if (routeInterestsRaw !== "") {
      try {
        const routeParsed: unknown = JSON.parse(routeInterestsRaw);
        if (Array.isArray(routeParsed)) {
          for (const routeRaw of routeParsed) {
            const route = toRecord(routeRaw);
            const routeId = typeof route.id === "string" ? route.id : "";
            const routeFrequency = typeof route.frequency === "string" && route.frequency !== "" ? route.frequency : "one_time";
            const routeNotes = typeof route.notes === "string" && route.notes !== "" ? route.notes : undefined;
            const routePayload: Record<string, unknown> = {
              humanId: params.id,
              activityId,
              frequency: routeFrequency,
              notes: routeNotes,
            };
            if (routeId !== "") {
              routePayload.routeInterestId = routeId;
            } else {
              routePayload.originCity = route.originCity;
              routePayload.originCountry = route.originCountry;
              routePayload.destinationCity = route.destinationCity;
              routePayload.destinationCountry = route.destinationCountry;
            }
            if (typeof route.travelYear === "number") routePayload.travelYear = route.travelYear;
            if (typeof route.travelMonth === "number") routePayload.travelMonth = route.travelMonth;
            if (typeof route.travelDay === "number") routePayload.travelDay = route.travelDay;
            await fetch(`${PUBLIC_API_URL}/api/route-interest-expressions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Cookie: `humans_session=${sessionToken ?? ""}`,
              },
              body: JSON.stringify(routePayload),
            });
          }
        }
      } catch { /* ignore malformed JSON */ }
    }

    return { success: true };
  },

  linkRouteSignup: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const routeSignupId = form.get("routeSignupId");
    const id = params.id ?? "";

    const res = await fetch(`${PUBLIC_API_URL}/api/humans/${id}/route-signups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ routeSignupId }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to link route signup");
    }

    return { success: true };
  },

  unlinkSignup: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const linkId = formStr(form.get("linkId"));
    const id = params.id ?? "";

    const res = await fetch(`${PUBLIC_API_URL}/api/humans/${id}/route-signups/${linkId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to unlink signup");
    }

    return { success: true };
  },

  addEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string; details?: unknown }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const labelIdVal = formStr(form.get("labelId"));
    const labelId = labelIdVal !== "" ? labelIdVal : undefined;
    const payload = {
      humanId: params.id,
      email: form.get("email"),
      labelId,
      isPrimary: form.get("isPrimary") === "on",
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add email");
    }

    return { success: true };
  },

  deleteEmail: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const emailId = formStr(form.get("id"));

    const res = await fetch(`${PUBLIC_API_URL}/api/emails/${emailId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
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

    const phoneLabelIdVal = formStr(form.get("labelId"));
    const phoneLabelId = phoneLabelIdVal !== "" ? phoneLabelIdVal : undefined;
    const payload = {
      humanId: params.id,
      phoneNumber: form.get("phoneNumber"),
      labelId: phoneLabelId,
      hasWhatsapp: form.get("hasWhatsapp") === "on",
      isPrimary: form.get("isPrimary") === "on",
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/phone-numbers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add phone number");
    }

    return { success: true };
  },

  deletePhoneNumber: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const phoneId = formStr(form.get("phoneId"));

    const res = await fetch(`${PUBLIC_API_URL}/api/phone-numbers/${phoneId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete phone number");
    }

    return { success: true };
  },

  addGeoInterestExpression: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const geoInterestId = formStr(form.get("geoInterestId")).trim();
    const notesVal = formStr(form.get("notes"));

    const payload: Record<string, unknown> = {
      humanId: params.id,
      notes: notesVal !== "" ? notesVal : undefined,
    };

    if (geoInterestId !== "") {
      payload.geoInterestId = geoInterestId;
    } else {
      payload.city = form.get("city");
      payload.country = form.get("country");
    }

    const res = await fetch(`${PUBLIC_API_URL}/api/geo-interest-expressions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add geo-interest expression");
    }

    return { success: true };
  },

  deleteGeoInterestExpression: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const expressionId = formStr(form.get("id"));

    const res = await fetch(`${PUBLIC_API_URL}/api/geo-interest-expressions/${expressionId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete geo-interest expression");
    }

    return { success: true };
  },

  addRouteInterestExpression: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const routeInterestId = formStr(form.get("routeInterestId")).trim();
    const notesRaw = formStr(form.get("notes")).trim();

    const payload: Record<string, unknown> = {
      humanId: params.id,
      notes: notesRaw !== "" ? notesRaw : undefined,
    };

    if (routeInterestId !== "") {
      payload.routeInterestId = routeInterestId;
    } else {
      payload.originCity = form.get("originCity");
      payload.originCountry = form.get("originCountry");
      payload.destinationCity = form.get("destinationCity");
      payload.destinationCountry = form.get("destinationCountry");
    }

    const frequency = formStr(form.get("frequency"));
    if (frequency !== "") payload.frequency = frequency;

    const travelYearStr = formStr(form.get("travelYear"));
    if (travelYearStr !== "") payload.travelYear = parseInt(travelYearStr, 10);
    const travelMonthStr = formStr(form.get("travelMonth"));
    if (travelMonthStr !== "") payload.travelMonth = parseInt(travelMonthStr, 10);
    const travelDayStr = formStr(form.get("travelDay"));
    if (travelDayStr !== "") payload.travelDay = parseInt(travelDayStr, 10);

    const res = await fetch(`${PUBLIC_API_URL}/api/route-interest-expressions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add route interest expression");
    }

    return { success: true };
  },

  deleteRouteInterestExpression: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const expressionId = formStr(form.get("id"));

    const res = await fetch(`${PUBLIC_API_URL}/api/route-interest-expressions/${expressionId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete route interest expression");
    }

    return { success: true };
  },

  addSocialId: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string; details?: unknown }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const platformIdVal = formStr(form.get("platformId"));
    const payload = {
      handle: form.get("handle"),
      platformId: platformIdVal !== "" ? platformIdVal : undefined,
      humanId: params.id,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/social-ids`, {
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

  deleteSocialId: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const socialIdId = formStr(form.get("id"));

    const res = await fetch(`${PUBLIC_API_URL}/api/social-ids/${socialIdId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete social ID");
    }

    return { success: true };
  },

  addWebsite: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string; details?: unknown }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const payload = {
      url: form.get("url"),
      humanId: params.id,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/websites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add website");
    }

    return { success: true };
  },

  deleteWebsite: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const websiteId = formStr(form.get("id"));

    const res = await fetch(`${PUBLIC_API_URL}/api/websites/${websiteId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete website");
    }

    return { success: true };
  },

  addReferralCode: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const descriptionVal = formStr(form.get("description"));
    const payload = {
      code: form.get("code"),
      description: descriptionVal !== "" ? descriptionVal : undefined,
      humanId: params.id,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/referral-codes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add referral code");
    }

    return { success: true };
  },

  deleteReferralCode: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const referralCodeId = formStr(form.get("id"));

    const res = await fetch(`${PUBLIC_API_URL}/api/referral-codes/${referralCodeId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete referral code");
    }

    return { success: true };
  },

  linkDiscountCode: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const discountCodeId = formStr(form.get("discountCodeId"));

    const res = await fetch(`${PUBLIC_API_URL}/api/discount-codes/${discountCodeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ humanId: params.id }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to link discount code");
    }

    return { success: true };
  },

  unlinkDiscountCode: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const discountCodeId = formStr(form.get("id"));

    const res = await fetch(`${PUBLIC_API_URL}/api/discount-codes/${discountCodeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ humanId: null }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to unlink discount code");
    }

    return { success: true };
  },

  deletePet: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const petId = formStr(form.get("id"));

    const res = await fetch(`${PUBLIC_API_URL}/api/pets/${petId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete pet");
    }

    return { success: true };
  },

  addPet: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const weightStr = formStr(form.get("weight"));
    const petTypeVal = formStr(form.get("type"));
    const petType = petTypeVal !== "" ? petTypeVal : "dog";
    const breedVal = formStr(form.get("breed"));
    const breed = petType === "dog" ? (breedVal !== "" ? breedVal : undefined) : undefined;
    const nameRaw = formStr(form.get("name")).trim();
    const payload = {
      humanId: params.id,
      type: petType,
      name: nameRaw !== "" ? nameRaw : null,
      breed,
      weight: weightStr !== "" ? parseFloat(weightStr) : undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/pets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add pet");
    }

    return { success: true };
  },

  linkAccount: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const accountId = formStr(form.get("accountId"));
    const labelIdVal = formStr(form.get("labelId"));
    const labelId = labelIdVal !== "" ? labelIdVal : undefined;

    const res = await fetch(`${PUBLIC_API_URL}/api/accounts/${accountId}/humans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ humanId: params.id, labelId }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to link account");
    }

    return { success: true };
  },

  createAndLinkAccount: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const accountName = formStr(form.get("accountName"));
    const labelIdVal = formStr(form.get("labelId"));
    const labelId = labelIdVal !== "" ? labelIdVal : undefined;

    // Create account
    const createRes = await fetch(`${PUBLIC_API_URL}/api/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ name: accountName }),
    });

    if (!createRes.ok) {
      const resBody: unknown = await createRes.json();
      return failFromApi(resBody, createRes.status, "Failed to create account");
    }

    const createBody: unknown = await createRes.json();
    const newAccountId = isObjData(createBody) && typeof createBody.data.id === "string" ? createBody.data.id : undefined;

    if (newAccountId == null) {
      return fail(500, { error: "Failed to get new account ID" });
    }

    // Link human to new account
    const linkRes = await fetch(`${PUBLIC_API_URL}/api/accounts/${newAccountId}/humans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ humanId: params.id, labelId }),
    });

    if (!linkRes.ok) {
      const resBody: unknown = await linkRes.json();
      return failFromApi(resBody, linkRes.status, "Failed to link account");
    }

    return { success: true };
  },

  linkBookingRequest: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const websiteBookingRequestId = form.get("websiteBookingRequestId");
    const id = params.id ?? "";

    const res = await fetch(`${PUBLIC_API_URL}/api/humans/${id}/website-booking-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ websiteBookingRequestId }),
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
    const linkId = formStr(form.get("linkId"));
    const id = params.id ?? "";

    const res = await fetch(`${PUBLIC_API_URL}/api/humans/${id}/website-booking-requests/${linkId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to unlink booking request");
    }

    return { success: true };
  },

  addOpportunity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const headers = {
      "Content-Type": "application/json",
      Cookie: `humans_session=${sessionToken ?? ""}`,
    };

    const passengerSeatsStr = formStr(form.get("passengerSeats"));
    const petSeatsStr = formStr(form.get("petSeats"));
    const petIds = form.getAll("petIds").map((v) => formStr(v));

    const payload = {
      passengerSeats: passengerSeatsStr !== "" ? parseInt(passengerSeatsStr, 10) : 1,
      petSeats: petSeatsStr !== "" ? parseInt(petSeatsStr, 10) : 0,
    };

    // 1. Create the opportunity
    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to create opportunity");
    }

    const created: unknown = await res.json();
    if (!isObjData(created)) {
      return fail(500, { error: "Unexpected response" });
    }

    const oppId = String(created.data.id);

    // 2. Link the current human as primary
    await fetch(`${PUBLIC_API_URL}/api/opportunities/${oppId}/humans`, {
      method: "POST",
      headers,
      body: JSON.stringify({ humanId: params.id }),
    });

    // 3. Link pets (best-effort)
    for (const petId of petIds) {
      if (petId !== "") {
        await fetch(`${PUBLIC_API_URL}/api/opportunities/${oppId}/pets`, {
          method: "POST",
          headers,
          body: JSON.stringify({ petId }),
        });
      }
    }

    return { success: true };
  },

  addRelationship: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const humanId2 = formStr(form.get("humanId2"));
    const labelIdVal = formStr(form.get("labelId"));
    const labelId = labelIdVal !== "" ? labelIdVal : undefined;
    const id = params.id ?? "";

    const res = await fetch(`${PUBLIC_API_URL}/api/humans/${id}/relationships`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ humanId2, labelId }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to add relationship");
    }

    return { success: true };
  },

  removeRelationship: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const relationshipId = formStr(form.get("id"));
    const id = params.id ?? "";

    const res = await fetch(`${PUBLIC_API_URL}/api/humans/${id}/relationships/${relationshipId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to remove relationship");
    }

    return { success: true };
  },

  unlinkAccount: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const accountId = formStr(form.get("accountId"));
    const linkId = formStr(form.get("linkId"));

    const res = await fetch(`${PUBLIC_API_URL}/api/accounts/${accountId}/humans/${linkId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to unlink account");
    }

    return { success: true };
  },

  addAgreement: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const typeIdVal = formStr(form.get("typeId"));
    const activationDateVal = formStr(form.get("activationDate"));
    const notesVal = formStr(form.get("notes"));

    const payload = {
      title: form.get("title"),
      typeId: typeIdVal !== "" ? typeIdVal : undefined,
      humanId: params.id,
      activationDate: activationDateVal !== "" ? activationDateVal : undefined,
      notes: notesVal !== "" ? notesVal : undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/agreements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    const resBody: unknown = await res.json();

    if (!res.ok) {
      return failFromApi(resBody, res.status, "Failed to create agreement");
    }

    // Upload file if present
    const file = form.get("file");
    if (file instanceof File && file.size > 0 && isObjData(resBody)) {
      const agreementId = typeof resBody.data.id === "string" ? resBody.data.id : undefined;
      if (agreementId != null && agreementId !== "") {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        uploadForm.append("entityType", "agreement");
        uploadForm.append("entityId", agreementId);

        await fetch(`${PUBLIC_API_URL}/api/documents/upload`, {
          method: "POST",
          headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
          body: uploadForm,
        });
      }
    }

    return { success: true };
  },
};
