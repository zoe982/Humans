import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, fetchConfigs, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ socialId: Record<string, unknown>; platformConfigs: unknown[]; allHumans: unknown[]; allAccounts: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";

  const socialIdRes = await fetch(`${PUBLIC_API_URL}/api/social-ids/${id}`, {
    headers: authHeaders(sessionToken),
  });

  if (!socialIdRes.ok) redirect(302, "/social-ids");
  const socialIdRaw: unknown = await socialIdRes.json();
  const socialId = isObjData(socialIdRaw) ? socialIdRaw.data : null;
  if (socialId == null) redirect(302, "/social-ids");

  const headers = authHeaders(sessionToken);
  const [configs, humansRes, accountsRes] = await Promise.all([
    fetchConfigs(sessionToken, ["social-id-platforms"]),
    fetch(`${PUBLIC_API_URL}/api/humans`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/accounts`, { headers }),
  ]);

  const parseList = async (res: Response): Promise<unknown[]> => {
    if (!res.ok) return [];
    const raw: unknown = await res.json();
    return isListData(raw) ? raw.data : [];
  };

  const [allHumans, allAccounts] = await Promise.all([
    parseList(humansRes),
    parseList(accountsRes),
  ]);

  return {
    socialId,
    platformConfigs: configs["social-id-platforms"] ?? [],
    allHumans,
    allAccounts,
  };
};
