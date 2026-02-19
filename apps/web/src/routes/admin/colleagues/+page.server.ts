import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { createColleagueSchema, updateColleagueSchema } from "@humans/shared";

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

function isErrorBody(value: unknown): value is { error?: string } {
  return typeof value === "object" && value !== null;
}

export const load = async ({ locals, cookies }: RequestEvent): Promise<{ colleagues: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");
  if (locals.user.role !== "admin") redirect(302, "/dashboard");

  const sessionToken = cookies.get("humans_session");
  const res = await fetch(`${PUBLIC_API_URL}/api/admin/colleagues`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) return { colleagues: [] };
  const raw: unknown = await res.json();
  return { colleagues: isListData(raw) ? raw.data : [] };
};

export const actions = {
  invite: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; fields?: Record<string, string[]> }> | { success: true }> => {
    const form = await request.formData();
    const raw = {
      email: form.get("email"),
      firstName: form.get("firstName"),
      middleNames: form.get("middleNames") || undefined,
      lastName: form.get("lastName"),
      role: form.get("role"),
    };

    const parsed = createColleagueSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(400, { error: "Invalid input", fields: parsed.error.flatten().fieldErrors });
    }

    const sessionToken = cookies.get("humans_session");
    const res = await fetch(`${PUBLIC_API_URL}/api/admin/colleagues`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to invite colleague" });
    }

    return { success: true };
  },

  update: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const id = form.get("id");
    const idStr = typeof id === "string" ? id : "";
    const raw = {
      role: form.get("role") ?? undefined,
      isActive: form.get("isActive") === "true",
    };

    const parsed = updateColleagueSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(400, { error: "Invalid input" });
    }

    const sessionToken = cookies.get("humans_session");
    const res = await fetch(`${PUBLIC_API_URL}/api/admin/colleagues/${idStr}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(parsed.data),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      const body = isErrorBody(resBody) ? resBody : {};
      return fail(res.status, { error: body.error ?? "Failed to update colleague" });
    }

    return { success: true };
  },
};
