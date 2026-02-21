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

  // Fetch human detail (now includes phoneNumbers and pets)
  const humanRes = await fetch(`${PUBLIC_API_URL}/api/humans/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!humanRes.ok) redirect(302, "/humans");
  const humanRaw: unknown = await humanRes.json();
  const human = isObjData(humanRaw) ? humanRaw.data : null;
  if (human == null) redirect(302, "/humans");

  // Fetch activities and label configs in parallel
  const [activitiesRes, emailLabelConfigs, phoneLabelConfigs, socialIdPlatformConfigs] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/activities?humanId=${id}`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
    fetchConfig(sessionToken ?? "", "human-email-labels"),
    fetchConfig(sessionToken ?? "", "human-phone-labels"),
    fetchConfig(sessionToken ?? "", "social-id-platforms"),
  ]);

  let activities: unknown[] = [];
  if (activitiesRes.ok) {
    const activitiesRaw: unknown = await activitiesRes.json();
    activities = isListData(activitiesRaw) ? activitiesRaw.data : [];
  }

  return { human, activities, apiUrl: PUBLIC_API_URL, emailLabelConfigs, phoneLabelConfigs, socialIdPlatformConfigs };
};

export const actions = {
  addActivity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const payload = {
      type: form.get("type") || "email",
      subject: form.get("subject"),
      notes: form.get("notes") || undefined,
      activityDate: (() => { const v = form.get("activityDate") as string; return v ? new Date(v).toISOString() : new Date().toISOString(); })(),
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
      activityId = (resBody.data as { id?: string }).id;
    }

    // Create geo-interest expressions from JSON array
    const geoInterestsRaw = (form.get("geoInterestsJson") as string)?.trim();
    if (geoInterestsRaw) {
      try {
        const geoItems = JSON.parse(geoInterestsRaw) as Array<{ id?: string; city?: string; country?: string; notes?: string }>;
        for (const geo of geoItems) {
          const geoPayload: Record<string, unknown> = {
            humanId: params.id,
            activityId,
            notes: geo.notes || undefined,
          };
          if (geo.id) {
            geoPayload.geoInterestId = geo.id;
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
      } catch { /* ignore malformed JSON */ }
    }

    // Create route-interest expressions from JSON array
    const routeInterestsRaw = (form.get("routeInterestsJson") as string)?.trim();
    if (routeInterestsRaw) {
      try {
        const routeItems = JSON.parse(routeInterestsRaw) as Array<{
          id?: string; originCity?: string; originCountry?: string;
          destinationCity?: string; destinationCountry?: string;
          frequency?: string; travelYear?: number; travelMonth?: number; travelDay?: number; notes?: string;
        }>;
        for (const route of routeItems) {
          const routePayload: Record<string, unknown> = {
            humanId: params.id,
            activityId,
            frequency: route.frequency || "one_time",
            notes: route.notes || undefined,
          };
          if (route.id) {
            routePayload.routeInterestId = route.id;
          } else {
            routePayload.originCity = route.originCity;
            routePayload.originCountry = route.originCountry;
            routePayload.destinationCity = route.destinationCity;
            routePayload.destinationCountry = route.destinationCountry;
          }
          if (route.travelYear) routePayload.travelYear = route.travelYear;
          if (route.travelMonth) routePayload.travelMonth = route.travelMonth;
          if (route.travelDay) routePayload.travelDay = route.travelDay;
          await fetch(`${PUBLIC_API_URL}/api/route-interest-expressions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `humans_session=${sessionToken ?? ""}`,
            },
            body: JSON.stringify(routePayload),
          });
        }
      } catch { /* ignore malformed JSON */ }
    }

    return { success: true };
  },

  unlinkSignup: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const linkId = form.get("linkId");
    const id = params.id;

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

  addEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const labelId = (form.get("labelId") as string) || undefined;
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
    const emailId = form.get("id");

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

  addPhoneNumber: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const phoneLabelId = (form.get("labelId") as string) || undefined;
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
    const phoneId = form.get("phoneId");

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

    const geoInterestId = (form.get("geoInterestId") as string)?.trim();

    const payload: Record<string, unknown> = {
      humanId: params.id,
      notes: form.get("notes") || undefined,
    };

    if (geoInterestId) {
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
    const expressionId = form.get("id");

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

    const routeInterestId = (form.get("routeInterestId") as string)?.trim();

    const payload: Record<string, unknown> = {
      humanId: params.id,
      notes: (form.get("notes") as string)?.trim() || undefined,
    };

    if (routeInterestId) {
      payload.routeInterestId = routeInterestId;
    } else {
      payload.originCity = form.get("originCity");
      payload.originCountry = form.get("originCountry");
      payload.destinationCity = form.get("destinationCity");
      payload.destinationCountry = form.get("destinationCountry");
    }

    const frequency = form.get("frequency") as string;
    if (frequency) payload.frequency = frequency;

    const travelYearStr = form.get("travelYear") as string;
    if (travelYearStr) payload.travelYear = parseInt(travelYearStr, 10);
    const travelMonthStr = form.get("travelMonth") as string;
    if (travelMonthStr) payload.travelMonth = parseInt(travelMonthStr, 10);
    const travelDayStr = form.get("travelDay") as string;
    if (travelDayStr) payload.travelDay = parseInt(travelDayStr, 10);

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
    const expressionId = form.get("id");

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

  addSocialId: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const payload = {
      handle: form.get("handle"),
      platformId: form.get("platformId") || undefined,
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
    const socialIdId = form.get("id");

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

  deletePet: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const petId = form.get("id");

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

    const weightStr = form.get("weight") as string;
    const petType = (form.get("type") as string) || "dog";
    const breed = petType === "dog" ? (form.get("breed") as string) || undefined : undefined;
    const payload = {
      humanId: params.id,
      type: petType,
      name: form.get("name"),
      breed,
      weight: weightStr ? parseFloat(weightStr) : undefined,
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
};
