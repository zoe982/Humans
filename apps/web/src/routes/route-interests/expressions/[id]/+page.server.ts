import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isObjData(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value;
}

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id;

  const res = await fetch(`${PUBLIC_API_URL}/api/route-interest-expressions/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) redirect(302, "/route-interests");
  const raw: unknown = await res.json();
  const expression = isObjData(raw) ? raw.data : null;
  if (expression == null) redirect(302, "/route-interests");

  return { expression, apiUrl: PUBLIC_API_URL };
};
