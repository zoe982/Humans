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
}): Promise<{ bookings: unknown[]; userRole: string }> => {
  const { user, sessionToken } = await parent();
  if (user === null) redirect(302, "/login");

  if (browser) {
    const store = getStore("website-booking-requests");
    if (store.items.length > 0) {
      void syncIfStale("website-booking-requests");
      return { bookings: store.items, userRole: user.role };
    }
  }

  const bookings = await fetchEntityList(fetch, "/api/website-booking-requests?limit=10000", sessionToken);

  if (browser) {
    const store = getStore("website-booking-requests");
    store.setItems(bookings.filter(isIdRecord));
  }

  return { bookings, userRole: user.role };
};
