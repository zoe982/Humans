import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isListData, failFromApi } from "$lib/server/api";

function isPaginatedData(value: unknown): value is { meta: { page: number; limit: number; total: number } } {
  return typeof value === "object" && value !== null && "meta" in value && typeof (value as { meta: unknown }).meta === "object";
}

export const load = async ({ locals, cookies, url }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 25;

  const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests?page=${page}&limit=${limit}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) return { bookings: [], page, limit, total: 0, userRole: locals.user?.role ?? "viewer" };
  const raw: unknown = await res.json();
  const meta = isPaginatedData(raw) ? raw.meta : { page, limit, total: 0 };
  return { bookings: isListData(raw) ? raw.data : [], page: meta.page, limit: meta.limit, total: meta.total, userRole: locals.user?.role ?? "viewer" };
};

export const actions = {
  delete: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const bookingId = form.get("id");

    const res = await fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${bookingId}`, {
      method: "DELETE",
      headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to delete booking request");
    }

    return { success: true };
  },
};
