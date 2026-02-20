import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isObjData(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value;
}

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id;

  const socialIdRes = await fetch(`${PUBLIC_API_URL}/api/social-ids/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });

  if (!socialIdRes.ok) redirect(302, "/social-ids");
  const socialIdRaw: unknown = await socialIdRes.json();
  const socialId = isObjData(socialIdRaw) ? socialIdRaw.data : null;
  if (socialId == null) redirect(302, "/social-ids");

  const [platformsRes, humansRes, accountsRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/admin/account-config/social-id-platforms`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
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

  const [platformConfigs, allHumans, allAccounts] = await Promise.all([
    parseList(platformsRes),
    parseList(humansRes),
    parseList(accountsRes),
  ]);

  return {
    socialId,
    platformConfigs,
    allHumans,
    allAccounts,
  };
};
