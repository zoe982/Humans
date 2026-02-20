import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { PUBLIC_API_URL } from "$env/static/public";

interface Colleague {
  id: string;
  displayId: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  isActive: boolean;
}

function isColleagueData(value: unknown): value is { data: Colleague[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  );
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
  if (locals.user == null) {
    redirect(302, "/login");
  }
  if (locals.user.role !== "manager" && locals.user.role !== "admin") {
    redirect(302, "/dashboard");
  }

  let colleagues: Colleague[] = [];

  const sessionToken = cookies.get("humans_session");
  const res = await fetch(`${PUBLIC_API_URL}/api/admin/colleagues`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (res.ok) {
    const raw: unknown = await res.json();
    if (isColleagueData(raw)) {
      colleagues = raw.data;
    }
  }

  return { colleagues };
};
