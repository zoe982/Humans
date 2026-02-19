import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiError } from "$lib/api";

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

function isDataWithId(value: unknown): value is { data: { id: string } } {
  return typeof value === "object" && value !== null && "data" in value;
}

export const load = async ({ locals, cookies }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";

  // Fetch account types config for checkboxes
  const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/account-types`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });

  let accountTypes: unknown[] = [];
  if (res.ok) {
    const raw: unknown = await res.json();
    accountTypes = isListData(raw) ? raw.data : [];
  }

  return { accountTypes };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session") ?? "";

    const typeIds = form.getAll("typeIds") as string[];

    const payload = {
      name: form.get("name"),
      typeIds: typeIds.length > 0 ? typeIds : undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json().catch(() => ({}));
      return fail(res.status, { error: extractApiError(resBody, "Failed to create account") });
    }

    const created: unknown = await res.json();
    if (!isDataWithId(created)) {
      return fail(500, { error: "Unexpected response" });
    }

    redirect(302, `/accounts/${created.data.id}`);
  },
};
