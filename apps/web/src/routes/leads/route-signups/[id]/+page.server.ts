import { redirect } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, failFromApi } from "$lib/server/api";

function getFormString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ signup: unknown; activities: unknown[]; colleagues: unknown[]; marketingAttribution: unknown; user: NonNullable<typeof locals.user> }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id;

  // Fetch single signup
  const signupRes = await fetch(`${PUBLIC_API_URL}/api/route-signups/${id ?? ""}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!signupRes.ok) redirect(302, "/leads/route-signups");
  const signupRaw: unknown = await signupRes.json();
  const signup = isObjData(signupRaw) ? signupRaw.data : null;
  if (signup == null) redirect(302, "/leads/route-signups");

  // Build parallel fetch list: activities, colleagues, and optionally attribution
  const signupObj = signup as Record<string, unknown>;
  const marketingAttributionId = typeof signupObj["marketing_attribution_id"] === "string" ? signupObj["marketing_attribution_id"] : null;

  const parallelFetches: Promise<Response>[] = [
    fetch(`${PUBLIC_API_URL}/api/activities?routeSignupId=${id ?? ""}`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/colleagues`, {
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    }),
  ];
  if (marketingAttributionId != null) {
    parallelFetches.push(
      fetch(`${PUBLIC_API_URL}/api/marketing-attributions/${marketingAttributionId}`, {
        headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
      }),
    );
  }
  const [activitiesRes, colleaguesRes, attributionRes] = await Promise.all(parallelFetches) as [Response, Response, Response | undefined];

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

  let marketingAttribution: unknown = null;
  if (attributionRes != null && attributionRes.ok) {
    const attrRaw: unknown = await attributionRes.json();
    marketingAttribution = isObjData(attrRaw) ? attrRaw.data : null;
  }

  return { signup, activities, colleagues, marketingAttribution, user: locals.user };
};

export const actions = {
  updateStatus: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const res = await fetch(`${PUBLIC_API_URL}/api/route-signups/${params.id ?? ""}`, {
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

    const res = await fetch(`${PUBLIC_API_URL}/api/route-signups/${params.id ?? ""}`, {
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

  delete: async ({ cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const sessionToken = cookies.get("humans_session");

    const res = await fetch(`${PUBLIC_API_URL}/api/route-signups/${params.id ?? ""}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete");
    }

    redirect(302, "/leads/route-signups");
  },

  addActivity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const payload = {
      type: form.get("type") ?? "email",
      subject: form.get("subject"),
      notes: form.get("notes") ?? undefined,
      activityDate: form.get("activityDate") ?? new Date().toISOString(),
      routeSignupId: params.id,
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

    const res = await fetch(`${PUBLIC_API_URL}/api/humans/${humanId}/convert-from-signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ routeSignupId: params.id }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to convert");
    }

    return { success: true };
  },
};
