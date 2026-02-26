import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ routeInterest: Record<string, unknown>; activities: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";
  const headers = authHeaders(sessionToken);

  const [riRes, activitiesRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/route-interests/${id}`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/activities?routeSignupId=${id}&limit=200&include=linkedEntities`, { headers }),
  ]);

  if (!riRes.ok) redirect(302, "/route-interests");
  const riRaw: unknown = await riRes.json();
  const routeInterest = isObjData(riRaw) ? riRaw.data : null;
  if (routeInterest == null) redirect(302, "/route-interests");

  const activitiesRaw: unknown = await activitiesRes.json();
  const activities = isListData(activitiesRaw) ? activitiesRaw.data : [];

  return {
    routeInterest,
    activities,
  };
};
