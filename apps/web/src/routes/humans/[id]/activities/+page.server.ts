import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ human: Record<string, unknown>; activities: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";
  const headers = authHeaders(sessionToken);

  const [humanRes, activitiesRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/humans/${id}`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/activities?humanId=${id}&limit=200&include=linkedEntities`, { headers }),
  ]);

  if (!humanRes.ok) redirect(302, "/humans");
  const humanRaw: unknown = await humanRes.json();
  const human = isObjData(humanRaw) ? humanRaw.data : null;
  if (human == null) redirect(302, "/humans");

  const activitiesRaw: unknown = await activitiesRes.json();
  const activities = isListData(activitiesRaw) ? activitiesRaw.data : [];

  return {
    human,
    activities,
  };
};
