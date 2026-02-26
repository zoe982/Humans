import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData } from "$lib/server/api";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{
  score: Record<string, unknown>;
  user: NonNullable<typeof locals.user>;
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const id = params.id ?? "";

  const res = await fetch(`${PUBLIC_API_URL}/api/lead-scores/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) redirect(302, "/reports/lead-scores");
  const raw: unknown = await res.json();
  const score = isObjData(raw) ? raw.data : null;
  if (score == null) redirect(302, "/reports/lead-scores");

  return { score, user: locals.user };
};
