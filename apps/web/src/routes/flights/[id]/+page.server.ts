import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isObjData(value: unknown): value is { data: Record<string, unknown>; linkedOpportunities: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value;
}

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id;

  const res = await fetch(`${PUBLIC_API_URL}/api/flights/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) redirect(302, "/flights");
  const raw: unknown = await res.json();
  if (!isObjData(raw)) redirect(302, "/flights");

  return {
    flight: raw.data,
    linkedOpportunities: raw.linkedOpportunities ?? [],
  };
};
