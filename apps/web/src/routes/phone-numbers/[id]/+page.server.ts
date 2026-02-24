import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, fetchConfigs, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ phone: Record<string, unknown>; humanPhoneLabelConfigs: unknown[]; accountPhoneLabelConfigs: unknown[]; allHumans: unknown[]; allAccounts: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";

  const phoneRes = await fetch(`${PUBLIC_API_URL}/api/phone-numbers/${id}`, {
    headers: authHeaders(sessionToken),
  });

  if (!phoneRes.ok) redirect(302, "/phone-numbers");
  const phoneRaw: unknown = await phoneRes.json();
  const phone = isObjData(phoneRaw) ? phoneRaw.data : null;
  if (phone == null) redirect(302, "/phone-numbers");

  const headers = authHeaders(sessionToken);
  const [configs, humansRes, accountsRes] = await Promise.all([
    fetchConfigs(sessionToken, ["human-phone-labels", "account-phone-labels"]),
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
    phone,
    humanPhoneLabelConfigs: configs["human-phone-labels"] ?? [],
    accountPhoneLabelConfigs: configs["account-phone-labels"] ?? [],
    allHumans,
    allAccounts,
  };
};
