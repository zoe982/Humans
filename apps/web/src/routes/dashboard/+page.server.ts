import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user == null) {
    redirect(302, "/login");
  }
  return { user: locals.user };
};
