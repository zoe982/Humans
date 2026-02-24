import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ website: Record<string, unknown>; allHumans: unknown[]; allAccounts: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";

  const websiteRes = await fetch(`${PUBLIC_API_URL}/api/websites/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });

  if (!websiteRes.ok) redirect(302, "/websites");
  const websiteRaw: unknown = await websiteRes.json();
  const website = isObjData(websiteRaw) ? websiteRaw.data : null;
  if (website == null) redirect(302, "/websites");

  const [humansRes, accountsRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/humans`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/accounts`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
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
    website,
    allHumans,
    allAccounts,
  };
};
