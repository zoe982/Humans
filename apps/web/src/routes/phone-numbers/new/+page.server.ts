import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isListData, isObjData, failFromApi, fetchConfigs, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies }: RequestEvent): Promise<{ allHumans: unknown[]; phoneLabelConfigs: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";

  const [humansRes, configs] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/humans`, {
      headers: authHeaders(sessionToken),
    }),
    fetchConfigs(sessionToken, ["human-phone-labels"]),
  ]);

  let allHumans: unknown[] = [];
  if (humansRes.ok) {
    const raw: unknown = await humansRes.json();
    allHumans = isListData(raw) ? raw.data : [];
  }

  return { allHumans, phoneLabelConfigs: configs["human-phone-labels"] ?? [] };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string; details?: unknown }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const labelIdRaw = form.get("labelId");
    const payload = {
      humanId: form.get("humanId"),
      phoneNumber: form.get("phoneNumber"),
      labelId: typeof labelIdRaw === "string" && labelIdRaw !== "" ? labelIdRaw : undefined,
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
      return failFromApi(resBody, res.status, "Failed to create phone number");
    }

    const created: unknown = await res.json();
    if (!isObjData(created)) {
      return fail(500, { error: "Unexpected response" });
    }

    const createdId = "id" in created.data ? String(created.data["id"]) : "";
    redirect(302, `/phone-numbers/${createdId}`);
  },
};
