import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ opportunity: Record<string, unknown>; activities: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";
  const headers = authHeaders(sessionToken);

  const [oppRes, activitiesRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/opportunities/${id}`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/activities?opportunityId=${id}&limit=200`, { headers }),
  ]);

  if (!oppRes.ok) redirect(302, "/opportunities");
  const oppRaw: unknown = await oppRes.json();
  const opportunity = isObjData(oppRaw) ? oppRaw.data : null;
  if (opportunity == null) redirect(302, "/opportunities");

  const activitiesRaw: unknown = await activitiesRes.json();
  const activities = isListData(activitiesRaw) ? activitiesRaw.data : [];

  return {
    opportunity,
    activities,
  };
};
