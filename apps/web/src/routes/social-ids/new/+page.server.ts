import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiErrorInfo } from "$lib/api";

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

function isDataWithId(value: unknown): value is { data: { id: string } } {
  return typeof value === "object" && value !== null && "data" in value;
}

function failFromApi(resBody: unknown, status: number, fallback: string): ActionFailure<{ error: string; code?: string; requestId?: string }> {
  const info = extractApiErrorInfo(resBody, fallback);
  return fail(status, { error: info.message, code: info.code, requestId: info.requestId });
}

export const load = async ({ locals, cookies }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";

  const [humansRes, platformsRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/humans`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
    fetch(`${PUBLIC_API_URL}/api/admin/account-config/social-id-platforms`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
  ]);

  const parseList = async (res: Response) => {
    if (!res.ok) return [];
    const raw: unknown = await res.json();
    return isListData(raw) ? raw.data : [];
  };

  const [allHumans, platformConfigs] = await Promise.all([
    parseList(humansRes),
    parseList(platformsRes),
  ]);

  return { allHumans, platformConfigs };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const payload = {
      handle: form.get("handle"),
      platformId: form.get("platformId") || undefined,
      humanId: form.get("humanId") || undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/social-ids`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to create social ID");
    }

    const created: unknown = await res.json();
    if (!isDataWithId(created)) {
      return fail(500, { error: "Unexpected response" });
    }

    redirect(302, `/social-ids/${created.data.id}`);
  },
};
