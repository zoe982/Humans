import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ attribution: unknown; user: NonNullable<typeof locals.user> }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id;

  const res = await fetch(`${PUBLIC_API_URL}/api/marketing-attributions/${id ?? ""}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) redirect(302, "/marketing-attributions");
  const raw: unknown = await res.json();
  const attribution = isObjData(raw) ? raw.data : null;
  if (attribution == null) redirect(302, "/marketing-attributions");

  return { attribution, user: locals.user };
};
