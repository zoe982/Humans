import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ lead: Record<string, unknown>; activities: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";
  const headers = authHeaders(sessionToken);

  const [leadRes, activitiesRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/evacuation-leads/${id}`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/activities?evacuationLeadId=${id}&limit=200&include=linkedEntities`, { headers }),
  ]);

  if (!leadRes.ok) redirect(302, "/leads/evacuation-leads");
  const leadRaw: unknown = await leadRes.json();
  const lead = isObjData(leadRaw) ? leadRaw.data : null;
  if (lead == null) redirect(302, "/leads/evacuation-leads");

  const activitiesRaw: unknown = await activitiesRes.json();
  const activities = isListData(activitiesRaw) ? activitiesRaw.data : [];

  return {
    lead,
    activities,
  };
};
