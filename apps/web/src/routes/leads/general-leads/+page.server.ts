import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { failFromApi } from "$lib/server/api";

function formStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export const actions = {
  delete: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const leadId = formStr(form.get("id"));

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/${leadId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete general lead");
    }

    return { success: true };
  },
};
