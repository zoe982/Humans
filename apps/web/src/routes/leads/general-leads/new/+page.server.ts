import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { failFromApi } from "$lib/server/api";

interface Colleague {
  id: string;
  name: string;
  displayId: string;
}

function isDataWithId(value: unknown): value is { data: { id: string } } {
  return typeof value === "object" && value !== null && "data" in value;
}

function isColleaguesData(value: unknown): value is { data: Colleague[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  );
}

function getFormString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

export const load = async ({ locals, cookies }: RequestEvent): Promise<{ colleagues: Colleague[] }> => {
  if (locals.user == null) redirect(302, "/login");

  // Fetch colleagues for the owner dropdown
  const sessionToken = cookies.get("humans_session");
  const colleaguesRes = await fetch(`${PUBLIC_API_URL}/api/colleagues`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  let colleagues: Colleague[] = [];
  if (colleaguesRes.ok) {
    const raw: unknown = await colleaguesRes.json();
    if (isColleaguesData(raw)) {
      colleagues = raw.data;
    }
  }

  return { colleagues };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const notesVal = getFormString(form, "notes");
    const ownerIdVal = getFormString(form, "ownerId");
    const middleNameVal = getFormString(form, "middleName");

    const payload = {
      firstName: getFormString(form, "firstName"),
      middleName: middleNameVal !== "" ? middleNameVal : undefined,
      lastName: getFormString(form, "lastName"),
      notes: notesVal !== "" ? notesVal : undefined,
      ownerId: ownerIdVal !== "" ? ownerIdVal : undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/general-leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to create general lead");
    }

    const created: unknown = await res.json();
    if (!isDataWithId(created)) {
      return fail(500, { error: "Unexpected response" });
    }

    redirect(302, `/leads/general-leads/${created.data.id}`);
  },
};
