import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData } from "$lib/server/api";

interface FlightResponse {
  data: Record<string, unknown>;
  linkedOpportunities?: unknown[];
  linkedDiscountCodes?: unknown[];
}

function isFlightResponse(value: unknown): value is FlightResponse {
  return isObjData(value);
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ flight: Record<string, unknown>; linkedOpportunities: unknown[]; linkedDiscountCodes: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id ?? "";

  const res = await fetch(`${PUBLIC_API_URL}/api/flights/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) redirect(302, "/flights");
  const raw: unknown = await res.json();
  if (!isFlightResponse(raw)) redirect(302, "/flights");

  return {
    flight: raw.data,
    linkedOpportunities: raw.linkedOpportunities ?? [],
    linkedDiscountCodes: raw.linkedDiscountCodes ?? [],
  };
};
