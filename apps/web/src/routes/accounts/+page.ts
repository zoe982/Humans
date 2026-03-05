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
}): Promise<{ accounts: unknown[]; userRole: string }> => {
  const { user, sessionToken } = await parent();
  if (user === null) redirect(302, "/login");

  if (browser) {
    const store = getStore("accounts");
    if (store.items.length > 0) {
      void syncIfStale("accounts");
      return { accounts: store.items, userRole: user.role };
    }
  }

  const accounts = await fetchEntityList(fetch, "/api/accounts?limit=10000", sessionToken);

  if (browser) {
    const store = getStore("accounts");
    store.setItems(accounts.filter(isIdRecord));
  }

  return { accounts, userRole: user.role };
};
