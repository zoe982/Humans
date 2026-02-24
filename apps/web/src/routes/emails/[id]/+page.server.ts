import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, fetchConfigs, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id;

  const emailRes = await fetch(`${PUBLIC_API_URL}/api/emails/${id}`, {
    headers: authHeaders(sessionToken),
  });

  if (!emailRes.ok) redirect(302, "/emails");
  const emailRaw: unknown = await emailRes.json();
  const email = isObjData(emailRaw) ? emailRaw.data : null;
  if (email == null) redirect(302, "/emails");

  const headers = authHeaders(sessionToken);
  const [configs, humansRes, accountsRes] = await Promise.all([
    fetchConfigs(sessionToken, ["human-email-labels", "account-email-labels"]),
    fetch(`${PUBLIC_API_URL}/api/humans`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/accounts`, { headers }),
  ]);

  const parseList = async (res: Response) => {
    if (!res.ok) return [];
    const raw: unknown = await res.json();
    return isListData(raw) ? raw.data : [];
  };

  const [allHumans, allAccounts] = await Promise.all([
    parseList(humansRes),
    parseList(accountsRes),
  ]);

  return {
    email,
    humanEmailLabelConfigs: configs["human-email-labels"] ?? [],
    accountEmailLabelConfigs: configs["account-email-labels"] ?? [],
    allHumans,
    allAccounts,
  };
};
