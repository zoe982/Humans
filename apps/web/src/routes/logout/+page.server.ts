import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

export const actions = {
  default: async ({ cookies, fetch }: RequestEvent): Promise<never> => {
    const sessionToken = cookies.get("humans_session");
    if (sessionToken != null && sessionToken !== "") {
      await fetch(`${PUBLIC_API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { Cookie: `humans_session=${sessionToken}` },
      }).catch(() => null);
      cookies.delete("humans_session", { path: "/" });
    }
    redirect(303, "/login");
  },
};
