import { browser } from "$app/environment";
import { redirect } from "@sveltejs/kit";
import { fetchEntityList } from "$lib/data/api-helpers";
import { getStore } from "$lib/data/stores.svelte";
import { syncIfStale } from "$lib/data/sync";

function isIdRecord(x: unknown): x is { id: string } {
  return typeof x === "object" && x !== null && "id" in x && typeof (x as Record<string, unknown>)["id"] === "string";
}

export const load = async ({
  parent,
  fetch,
}: {
  parent: () => Promise<{ user: { id: string; role: string } | null; sessionToken: string | null }>;
  fetch: typeof globalThis.fetch;
}): Promise<{ evacuationLeads: unknown[]; userRole: string }> => {
  const { user, sessionToken } = await parent();
  if (user === null) redirect(302, "/login");

  if (browser) {
    const store = getStore("evacuation-leads");
    if (store.items.length > 0) {
      void syncIfStale("evacuation-leads");
      return { evacuationLeads: store.items, userRole: user.role };
    }
  }

  const evacuationLeads = await fetchEntityList(fetch, "/api/evacuation-leads?limit=500", sessionToken);

  if (browser) {
    const store = getStore("evacuation-leads");
    store.setItems(evacuationLeads.filter(isIdRecord));
  }

  return { evacuationLeads, userRole: user.role };
};
