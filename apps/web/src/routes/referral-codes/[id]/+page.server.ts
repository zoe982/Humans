import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id;

  const referralCodeRes = await fetch(`${PUBLIC_API_URL}/api/referral-codes/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });

  if (!referralCodeRes.ok) redirect(302, "/referral-codes");
  const referralCodeRaw: unknown = await referralCodeRes.json();
  const referralCode = isObjData(referralCodeRaw) ? referralCodeRaw.data : null;
  if (referralCode == null) redirect(302, "/referral-codes");

  const [humansRes, accountsRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/humans`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/accounts`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
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
    referralCode,
    allHumans,
    allAccounts,
  };
};
