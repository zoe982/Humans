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
}): Promise<{ opportunities: unknown[]; colleagues: unknown[]; userRole: string }> => {
  const { user, sessionToken } = await parent();
  if (user === null) redirect(302, "/login");

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
    getStore("opportunities").setItems(opportunities.filter(isIdRecord));
    getStore("colleagues").setItems(colleagues.filter(isIdRecord));
  }

  return { opportunities, colleagues, userRole: user.role };
};
