import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { failFromApi } from "$lib/server/api";

function formStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function isImportResult(value: unknown): value is { data: { lead: { id: string; displayId: string } } } {
  return typeof value === "object" && value !== null && "data" in value;
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

  importFromFront: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ importError: string; code?: string; requestId?: string }>> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const frontId = formStr(form.get("frontId")).trim();

    if (frontId === "") {
      return fail(400, { importError: "Please enter a Front message or conversation ID" });
    }

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads/import-from-front`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ frontId }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      const info = failFromApi(resBody, res.status, "Failed to import from Front");
      // Re-key the error field to importError so it doesn't clash with delete errors
      return fail(res.status, { importError: info.data.error, code: info.data.code, requestId: info.data.requestId });
    }

    const created: unknown = await res.json();
    if (!isImportResult(created)) {
      return fail(500, { importError: "Unexpected response from API" });
    }

    redirect(302, `/leads/general-leads/${created.data.lead.id}`);
  },
};
