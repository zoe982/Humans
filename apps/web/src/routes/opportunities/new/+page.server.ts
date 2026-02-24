import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { failFromApi, isListData } from "$lib/server/api";

function isDataWithId(value: unknown): value is { data: { id: string } } {
  return typeof value === "object" && value !== null && "data" in value;
}

function getFormString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

export const load = async ({ locals, cookies }: RequestEvent): Promise<{ allHumans: unknown[]; allPets: unknown[]; apiUrl: string }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session");
  const headers = { Cookie: `humans_session=${sessionToken ?? ""}` };

  const [humansRes, petsRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/humans?limit=200`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/pets`, { headers }),
  ]);

  let allHumans: unknown[] = [];
  if (humansRes.ok) {
    const raw: unknown = await humansRes.json();
    allHumans = isListData(raw) ? raw.data : [];
  }

  let allPets: unknown[] = [];
  if (petsRes.ok) {
    const raw: unknown = await petsRes.json();
    allPets = isListData(raw) ? raw.data : [];
  }

  return { allHumans, allPets, apiUrl: PUBLIC_API_URL };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const headers = {
      "Content-Type": "application/json",
      Cookie: `humans_session=${sessionToken ?? ""}`,
    };

    const passengerSeatsStr = getFormString(form, "passengerSeats");
    const petSeatsStr = getFormString(form, "petSeats");
    const humanId = getFormString(form, "humanId");
    const petIds = form.getAll("petIds").map((v) => (typeof v === "string" ? v : ""));

    const payload = {
      passengerSeats: passengerSeatsStr !== "" ? parseInt(passengerSeatsStr, 10) : 1,
      petSeats: petSeatsStr !== "" ? parseInt(petSeatsStr, 10) : 0,
    };

    // 1. Create the opportunity
    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to create opportunity");
    }

    const created: unknown = await res.json();
    if (!isDataWithId(created)) {
      return fail(500, { error: "Unexpected response" });
    }

    const oppId = created.data.id;

    // 2. Link primary human (if provided)
    if (humanId !== "") {
      await fetch(`${PUBLIC_API_URL}/api/opportunities/${oppId}/humans`, {
        method: "POST",
        headers,
        body: JSON.stringify({ humanId }),
      });
    }

    // 3. Link pets (if any selected)
    for (const petId of petIds) {
      if (petId !== "") {
        await fetch(`${PUBLIC_API_URL}/api/opportunities/${oppId}/pets`, {
          method: "POST",
          headers,
          body: JSON.stringify({ petId }),
        });
      }
    }

    redirect(302, `/opportunities/${oppId}`);
  },
};
