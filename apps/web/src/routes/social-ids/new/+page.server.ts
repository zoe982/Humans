import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isListData, isObjData, failFromApi, fetchConfigs, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";

  const [humansRes, configs] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/humans`, {
      headers: authHeaders(sessionToken),
    }),
    fetchConfigs(sessionToken, ["social-id-platforms"]),
  ]);

  let allHumans: unknown[] = [];
  if (humansRes.ok) {
    const raw: unknown = await humansRes.json();
    allHumans = isListData(raw) ? raw.data : [];
  }

  return { allHumans, platformConfigs: configs["social-id-platforms"] ?? [] };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const payload = {
      handle: form.get("handle"),
      platformId: form.get("platformId") || undefined,
      humanId: form.get("humanId") || undefined,
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
      return failFromApi(resBody, res.status, "Failed to create social ID");
    }

    const created: unknown = await res.json();
    if (!isObjData(created)) {
      return fail(500, { error: "Unexpected response" });
    }

    redirect(302, `/social-ids/${(created.data as { id: string }).id}`);
  },
};
