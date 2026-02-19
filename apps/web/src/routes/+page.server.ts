import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";

export const load = ({ locals }: RequestEvent): never => {
  if (locals.user != null) {
    redirect(302, "/dashboard");
  }
  redirect(302, "/login");
};
