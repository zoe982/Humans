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
    const store = getStore("website-booking-requests");
    if (store.items.length > 0) {
      void syncIfStale("website-booking-requests");
      return { bookings: store.items, userRole: user.role };
    }
  }

  const bookings = await fetchEntityList(fetch, "/api/website-booking-requests?limit=10000", sessionToken);

  if (browser) {
    const store = getStore("website-booking-requests");
    store.setItems(bookings as Array<{ id: string }>);
  }

  return { bookings, userRole: user.role };
};
