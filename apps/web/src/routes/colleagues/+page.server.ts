import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isListData } from "$lib/server/api";

export const load = async ({ locals, cookies }: RequestEvent): Promise<{ colleagues: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const res = await fetch(`${PUBLIC_API_URL}/api/colleagues`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) return { colleagues: [] };
  const raw: unknown = await res.json();
  return { colleagues: isListData(raw) ? raw.data : [] };
};
