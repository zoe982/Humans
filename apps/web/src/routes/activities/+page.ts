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
}): Promise<{ activities: unknown[]; userRole: string }> => {
  const { user, sessionToken } = await parent();
  if (user === null) redirect(302, "/login");

  if (browser) {
    const store = getStore("activities");
    if (store.items.length > 0) {
      void syncIfStale("activities");
      return { activities: store.items, userRole: user.role };
    }
  }

  const activities = await fetchEntityList(fetch, "/api/activities?limit=10000", sessionToken);

  if (browser) {
    const store = getStore("activities");
    store.setItems(activities.filter(isIdRecord));
  }

  return { activities, userRole: user.role };
};
