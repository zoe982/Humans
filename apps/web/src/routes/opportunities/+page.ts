import { browser } from "$app/environment";
import { redirect } from "@sveltejs/kit";
import { fetchEntityList } from "$lib/data/api-helpers";
import { getStore } from "$lib/data/stores.svelte";
import { syncIfStale } from "$lib/data/sync";

export const load = async ({
  parent,
  fetch,
}: {
  parent: () => Promise<{ user: { id: string; role: string } | null; sessionToken: string | null }>;
  fetch: typeof globalThis.fetch;
}) => {
  const { user, sessionToken } = await parent();
  if (!user) redirect(302, "/login");

  if (browser) {
    const oppStore = getStore("opportunities");
    const colStore = getStore("colleagues");
    if (oppStore.items.length > 0) {
      void syncIfStale("opportunities");
      void syncIfStale("colleagues");
      return { opportunities: oppStore.items, colleagues: colStore.items, userRole: user.role };
    }
  }

  const [opportunities, colleagues] = await Promise.all([
    fetchEntityList(fetch, "/api/opportunities?limit=10000", sessionToken),
    fetchEntityList(fetch, "/api/colleagues?limit=10000", sessionToken),
  ]);

  if (browser) {
    getStore("opportunities").setItems(opportunities as Array<{ id: string }>);
    getStore("colleagues").setItems(colleagues as Array<{ id: string }>);
  }

  return { opportunities, colleagues, userRole: user.role };
};
