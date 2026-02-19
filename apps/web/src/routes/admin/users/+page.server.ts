import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { createUserSchema, updateUserSchema } from "@humans/shared";

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

function isErrorBody(value: unknown): value is { error?: string } {
  return typeof value === "object" && value !== null;
}

export const load = async ({ locals, cookies }: RequestEvent): Promise<{ users: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");
  if (locals.user.role !== "admin") redirect(302, "/dashboard");

  const sessionToken = cookies.get("humans_session");
  const res = await fetch(`${PUBLIC_API_URL}/api/admin/users`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) return { users: [] };
  const raw: unknown = await res.json();
  return { users: isListData(raw) ? raw.data : [] };
};

export const actions = {
  invite: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; fields?: Record<string, string[]> }> | { success: true }> => {
    const form = await request.formData();
    const raw = {
      email: form.get("email"),
      name: form.get("name"),
      role: form.get("role"),
    };

    const parsed = createUserSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(400, { error: "Invalid input", fields: parsed.error.flatten().fieldErrors });
    }

    const sessionToken = cookies.get("humans_session");
    const res = await fetch(`${PUBLIC_API_URL}/api/admin/users`, {
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
      return fail(res.status, { error: body.error ?? "Failed to invite user" });
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

    const parsed = updateUserSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(400, { error: "Invalid input" });
    }

    const sessionToken = cookies.get("humans_session");
    const res = await fetch(`${PUBLIC_API_URL}/api/admin/users/${idStr}`, {
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
      return fail(res.status, { error: body.error ?? "Failed to update user" });
    }

    return { success: true };
  },
};
