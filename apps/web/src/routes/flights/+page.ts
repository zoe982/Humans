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
    const store = getStore("flights");
    if (store.items.length > 0) {
      void syncIfStale("flights");
      return { flights: store.items, userRole: user.role };
    }
  }

  const flights = await fetchEntityList(fetch, "/api/flights?limit=10000", sessionToken);

  if (browser) {
    const store = getStore("flights");
    store.setItems(flights as Array<{ id: string }>);
  }

  return { flights, userRole: user.role };
};
