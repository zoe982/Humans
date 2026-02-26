import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ booking: Record<string, unknown>; activities: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";
  const headers = authHeaders(sessionToken);

  const [bookingRes, activitiesRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/website-booking-requests/${id}`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/activities?websiteBookingRequestId=${id}&limit=200&include=linkedEntities`, { headers }),
  ]);

  if (!bookingRes.ok) redirect(302, "/leads/website-booking-requests");
  const bookingRaw: unknown = await bookingRes.json();
  const booking = isObjData(bookingRaw) ? bookingRaw.data : null;
  if (booking == null) redirect(302, "/leads/website-booking-requests");

  const activitiesRaw: unknown = await activitiesRes.json();
  const activities = isListData(activitiesRaw) ? activitiesRaw.data : [];

  return {
    booking,
    activities,
  };
};
