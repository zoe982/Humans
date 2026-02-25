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
    const store = getStore("route-signups");
    if (store.items.length > 0) {
      void syncIfStale("route-signups");
      return { signups: store.items, userRole: user.role };
    }
  }

  const signups = await fetchEntityList(fetch, "/api/route-signups?limit=10000", sessionToken);

  if (browser) {
    const store = getStore("route-signups");
    store.setItems(signups as Array<{ id: string }>);
  }

  return { signups, userRole: user.role };
};
