import { redirect } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isListData, failFromApi } from "$lib/server/api";

export const load = async ({ locals, cookies }: RequestEvent): Promise<{ cadenceConfigs: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");
  if (locals.user.role !== "admin") redirect(302, "/dashboard");

  const sessionToken = cookies.get("humans_session") ?? "";
  const res = await fetch(`${PUBLIC_API_URL}/api/opportunity-cadence`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });

  let cadenceConfigs: unknown[] = [];
  if (res.ok) {
    const raw: unknown = await res.json();
    cadenceConfigs = isListData(raw) ? raw.data : [];
  }

  return { cadenceConfigs };
};

export const actions = {
  updateCadence: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";
    const idRaw = form.get("id");
    const id = typeof idRaw === "string" ? idRaw : "";
    const cadenceHours = Number(form.get("cadenceHours"));
    const displayTextRaw = form.get("displayText");
    const displayText = typeof displayTextRaw === "string" ? displayTextRaw : "";

    const res = await fetch(`${PUBLIC_API_URL}/api/admin/opportunity-cadence/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: `humans_session=${sessionToken}` },
      body: JSON.stringify({ cadenceHours, displayText }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return failFromApi(resBody, res.status, "Failed to update cadence config");
    }
    return { success: true };
  },
};
