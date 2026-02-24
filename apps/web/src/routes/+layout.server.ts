import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals, cookies }) => {
  return {
    user: locals.user,
    sessionToken: locals.user != null ? (cookies.get("humans_session") ?? null) : null,
  };
};
