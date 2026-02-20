import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isObjData(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value;
}

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

async function fetchConfig(sessionToken: string, configType: string) {
  const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/${configType}`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });
  if (!res.ok) return [];
  const raw: unknown = await res.json();
  return isListData(raw) ? raw.data : [];
}

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id;

  const phoneRes = await fetch(`${PUBLIC_API_URL}/api/phone-numbers/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });

  if (!phoneRes.ok) redirect(302, "/phone-numbers");
  const phoneRaw: unknown = await phoneRes.json();
  const phone = isObjData(phoneRaw) ? phoneRaw.data : null;
  if (phone == null) redirect(302, "/phone-numbers");

  const [humanPhoneLabelConfigs, accountPhoneLabelConfigs, humansRes, accountsRes] = await Promise.all([
    fetchConfig(sessionToken, "human-phone-labels"),
    fetchConfig(sessionToken, "account-phone-labels"),
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
    phone,
    humanPhoneLabelConfigs,
    accountPhoneLabelConfigs,
    allHumans,
    allAccounts,
  };
};
