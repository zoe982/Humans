import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiErrorInfo } from "$lib/api";

function isObjData(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value;
}

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id;

  const res = await fetch(`${PUBLIC_API_URL}/api/geo-interest-expressions/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) redirect(302, "/geo-interests");
  const raw: unknown = await res.json();
  const expression = isObjData(raw) ? raw.data : null;
  if (expression == null) redirect(302, "/geo-interests");

  return { expression, apiUrl: PUBLIC_API_URL };
};

export const actions = {
  delete: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string }> | void> => {
    const formData = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const id = params.id;
    const geoInterestId = formData.get("geoInterestId") as string;

    const res = await fetch(`${PUBLIC_API_URL}/api/geo-interest-expressions/${id}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      const info = extractApiErrorInfo(resBody, "Failed to delete expression.");
      return fail(res.status, { error: info.message });
    }

    redirect(302, `/geo-interests/${geoInterestId}`);
  },
};
