import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isObjData(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value;
}

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

function isErrorBody(value: unknown): value is { error?: string } {
  return typeof value === "object" && value !== null;
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

  // Fetch activities for this human
  const activitiesRes = await fetch(`${PUBLIC_API_URL}/api/activities?humanId=${id}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  let activities: unknown[] = [];
  if (activitiesRes.ok) {
    const activitiesRaw: unknown = await activitiesRes.json();
    activities = isListData(activitiesRaw) ? activitiesRaw.data : [];
  }

  return { human, activities, apiUrl: PUBLIC_API_URL };
};

export const actions = {
  addActivity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
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
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to create activity" });
    }

    // If geo-interest fields are present, create a geo-interest expression linked to this activity
    const geoInterestId = (form.get("geoInterestId") as string)?.trim();
    const geoCity = (form.get("geoCity") as string)?.trim();
    const geoCountry = (form.get("geoCountry") as string)?.trim();
    if (geoInterestId || (geoCity && geoCountry)) {
      let activityId: string | undefined;
      if (isObjData(resBody)) {
        activityId = (resBody.data as { id?: string }).id;
      }

      const geoPayload: Record<string, unknown> = {
        humanId: params.id,
        notes: (form.get("geoNotes") as string)?.trim() || undefined,
        activityId,
      };

      if (geoInterestId) {
        geoPayload.geoInterestId = geoInterestId;
      } else {
        geoPayload.city = geoCity;
        geoPayload.country = geoCountry;
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

    return { success: true };
  },

  unlinkSignup: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
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
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to unlink signup" });
    }

    return { success: true };
  },

  addEmail: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const payload = {
      humanId: params.id,
      email: form.get("email"),
      label: form.get("label") || "personal",
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
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to add email" });
    }

    return { success: true };
  },

  deleteEmail: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
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
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to delete email" });
    }

    return { success: true };
  },

  addPhoneNumber: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const payload = {
      humanId: params.id,
      phoneNumber: form.get("phoneNumber"),
      label: form.get("label") || "mobile",
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
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to add phone number" });
    }

    return { success: true };
  },

  deletePhoneNumber: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
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
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to delete phone number" });
    }

    return { success: true };
  },

  addGeoInterestExpression: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
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
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to add geo-interest expression" });
    }

    return { success: true };
  },

  deleteGeoInterestExpression: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
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
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to delete geo-interest expression" });
    }

    return { success: true };
  },

  addPet: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const weightStr = form.get("weight") as string;
    const payload = {
      humanId: params.id,
      name: form.get("name"),
      breed: form.get("breed") || undefined,
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
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to add pet" });
    }

    return { success: true };
  },
};
