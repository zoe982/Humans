import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isListData, failFromApi } from "$lib/server/api";

function isDataWithId(value: unknown): value is { data: { id: string } } {
  return typeof value === "object" && value !== null && "data" in value;
}

function getFormString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

export const load = async ({ locals, cookies }: RequestEvent): Promise<{ allHumans: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const humansRes = await fetch(`${PUBLIC_API_URL}/api/humans`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });

  let allHumans: unknown[] = [];
  if (humansRes.ok) {
    const raw: unknown = await humansRes.json();
    allHumans = isListData(raw) ? raw.data : [];
  }

  return { allHumans };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const weightStr = getFormString(form, "weight");
    const breedVal = getFormString(form, "breed");
    const notesVal = getFormString(form, "notes");

    const payload = {
      humanId: form.get("humanId"),
      name: form.get("name"),
      type: getFormString(form, "type") !== "" ? getFormString(form, "type") : "dog",
      breed: breedVal !== "" ? breedVal : null,
      weight: weightStr !== "" ? parseFloat(weightStr) : null,
      notes: notesVal !== "" ? notesVal : null,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/pets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to create pet");
    }

    const created: unknown = await res.json();
    if (!isDataWithId(created)) {
      return fail(500, { error: "Unexpected response" });
    }

    redirect(302, `/pets/${created.data.id}`);
  },
};
