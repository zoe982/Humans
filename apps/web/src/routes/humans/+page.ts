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
    const store = getStore("humans");
    if (store.items.length > 0) {
      void syncIfStale("humans");
      return { humans: store.items, userRole: user.role };
    }
  }

  const humans = await fetchEntityList(fetch, "/api/humans?limit=10000", sessionToken);

  if (browser) {
    const store = getStore("humans");
    store.setItems(humans as Array<{ id: string }>);
  }

  return { humans, userRole: user.role };
};
