import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isDataResponse(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value && typeof (value as { data: unknown }).data === "object";
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ entry: Record<string, unknown> }> => {
  if (locals.user == null) redirect(302, "/login");
  if (locals.user.role !== "admin") redirect(302, "/dashboard");

  const sessionToken = cookies.get("humans_session");
  const id = params.id ?? "";
  const res = await fetch(`${PUBLIC_API_URL}/api/admin/error-log/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) {
    redirect(302, "/admin/error-log");
  }

  const raw: unknown = await res.json();
  if (!isDataResponse(raw)) {
    redirect(302, "/admin/error-log");
  }

  return { entry: raw.data };
};

export const actions = {
  toggleResolution: async ({ request, locals, cookies, params }: RequestEvent): Promise<{ success: true }> => {
    if (locals.user == null) redirect(302, "/login");
    if (locals.user.role !== "admin") redirect(302, "/dashboard");

    const form = await request.formData();
    const statusRaw = form.get("status");
    const status = typeof statusRaw === "string" ? statusRaw : "";
    const sessionToken = cookies.get("humans_session");
    const id = params.id ?? "";

    await fetch(`${PUBLIC_API_URL}/api/admin/error-log/${id}/resolution`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify({ resolutionStatus: status }),
    });

    return { success: true };
  },
};
