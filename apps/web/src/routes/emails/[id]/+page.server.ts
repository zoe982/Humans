import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, fetchConfigs, authHeaders } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ email: Record<string, unknown>; humanEmailLabelConfigs: unknown[]; accountEmailLabelConfigs: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";

  const emailRes = await fetch(`${PUBLIC_API_URL}/api/emails/${id}`, {
    headers: authHeaders(sessionToken),
  });

  if (!emailRes.ok) redirect(302, "/emails");
  const emailRaw: unknown = await emailRes.json();
  const email = isObjData(emailRaw) ? emailRaw.data : null;
  if (email == null) redirect(302, "/emails");

  const configs = await fetchConfigs(sessionToken, ["human-email-labels", "account-email-labels"]);

  return {
    email,
    humanEmailLabelConfigs: configs["human-email-labels"] ?? [],
    accountEmailLabelConfigs: configs["account-email-labels"] ?? [],
  };
};
