import { redirect } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, failFromApi } from "$lib/server/api";

function formStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{
  lead: Record<string, unknown>;
  user: { id: string; email: string; role: string; name: string };
  allHumans: unknown[];
  colleagues: unknown[];
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id ?? "";

  const leadRes = await fetch(`${PUBLIC_API_URL}/api/general-leads/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!leadRes.ok) redirect(302, "/leads/general-leads");
  const leadRaw: unknown = await leadRes.json();
  const lead = isObjData(leadRaw) ? leadRaw.data : null;
  if (lead == null) redirect(302, "/leads/general-leads");

  const headers = { Cookie: `humans_session=${sessionToken ?? ""}` };
  const [humansRes, colleaguesRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/humans?limit=200`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/colleagues`, { headers }),
  ]);

  let allHumans: unknown[] = [];
  if (humansRes.ok) {
    const raw: unknown = await humansRes.json();
    allHumans = isListData(raw) ? raw.data : [];
  }

  let colleagues: unknown[] = [];
  if (colleaguesRes.ok) {
    const raw: unknown = await colleaguesRes.json();
    colleagues = isListData(raw) ? raw.data : [];
  }

  return { lead, user: locals.user, allHumans, colleagues };
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

  updateContact: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";
    const email = formStr(form.get("email"));
    const phone = formStr(form.get("phone"));

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({
        email: email !== "" ? email : null,
        phone: phone !== "" ? phone : null,
      }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to update contact info");
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
