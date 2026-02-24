import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isListData, failFromApi } from "$lib/server/api";

export const load = async ({ locals, cookies }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const res = await fetch(`${PUBLIC_API_URL}/api/pets`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) return { pets: [], userRole: locals.user?.role ?? "viewer" };
  const raw: unknown = await res.json();
  return { pets: isListData(raw) ? raw.data : [], userRole: locals.user?.role ?? "viewer" };
};

export const actions = {
  delete: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const petId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/pets/${petId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete pet");
    }

    return { success: true };
  },
};
