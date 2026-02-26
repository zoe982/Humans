import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, fetchConfigs, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ phone: Record<string, unknown>; humanPhoneLabelConfigs: unknown[]; accountPhoneLabelConfigs: unknown[] }> => {
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

  const configs = await fetchConfigs(sessionToken, ["human-phone-labels", "account-phone-labels"]);

  return {
    phone,
    humanPhoneLabelConfigs: configs["human-phone-labels"] ?? [],
    accountPhoneLabelConfigs: configs["account-phone-labels"] ?? [],
  };
};
