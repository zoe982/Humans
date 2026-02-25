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
    const store = getStore("general-leads");
    if (store.items.length > 0) {
      void syncIfStale("general-leads");
      return { leads: store.items, userRole: user.role };
    }
  }

  const leads = await fetchEntityList(fetch, "/api/general-leads?limit=10000", sessionToken);

  if (browser) {
    const store = getStore("general-leads");
    store.setItems(leads as Array<{ id: string }>);
  }

  return { leads, userRole: user.role };
};
