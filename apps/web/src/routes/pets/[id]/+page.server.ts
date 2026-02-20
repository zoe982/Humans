import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

function isObjData(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value;
}

function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export const load = async ({ locals, cookies, params }: RequestEvent) => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id;

  const petRes = await fetch(`${PUBLIC_API_URL}/api/pets/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });

  if (!petRes.ok) redirect(302, "/pets");
  const petRaw: unknown = await petRes.json();
  const pet = isObjData(petRaw) ? petRaw.data : null;
  if (pet == null) redirect(302, "/pets");

  const humansRes = await fetch(`${PUBLIC_API_URL}/api/humans`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });

  let allHumans: unknown[] = [];
  if (humansRes.ok) {
    const humansRaw: unknown = await humansRes.json();
    allHumans = isListData(humansRaw) ? humansRaw.data : [];
  }

  return { pet, allHumans };
};
