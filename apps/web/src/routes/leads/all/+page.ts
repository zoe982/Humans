import { redirect } from "@sveltejs/kit";
import { fetchEntityList } from "$lib/data/api-helpers";

export const load = async ({
  parent,
  fetch,
}: {
  parent: () => Promise<{ user: { id: string; role: string } | null; sessionToken: string | null }>;
  fetch: typeof globalThis.fetch;
}): Promise<{ allLeads: unknown[]; userRole: string }> => {
  const { user, sessionToken } = await parent();
  if (user === null) redirect(302, "/login");

  const allLeads = await fetchEntityList(fetch, "/api/leads/all", sessionToken);

  return { allLeads, userRole: user.role };
};
