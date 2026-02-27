import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ signup: Record<string, unknown>; activities: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";
  const headers = authHeaders(sessionToken);

  const [signupRes, activitiesRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/route-signups/${id}`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/activities?routeSignupId=${id}&limit=200&include=linkedEntities`, { headers }),
  ]);

  if (!signupRes.ok) redirect(302, "/leads/route-signups");
  const signupRaw: unknown = await signupRes.json();
  const signup = isObjData(signupRaw) ? signupRaw.data : null;
  if (signup == null) redirect(302, "/leads/route-signups");

  const activitiesRaw: unknown = await activitiesRes.json();
  const activities = isListData(activitiesRaw) ? activitiesRaw.data : [];

  return {
    signup,
    activities,
  };
};
