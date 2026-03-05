import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, failFromApi } from "$lib/server/api";

function formStr(val: FormDataEntryValue | null): string {
  return typeof val === "string" ? val : "";
}

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{ pet: Record<string, unknown>; allHumans: unknown[]; petOpportunities: unknown[]; allOpportunities: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";
  const headers = { Cookie: `humans_session=${sessionToken}` };

  const [petRes, humansRes, petOppsRes, allOppsRes] = await Promise.all([
    fetch(`${PUBLIC_API_URL}/api/pets/${id}`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/humans`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/pets/${id}/opportunities`, { headers }),
    fetch(`${PUBLIC_API_URL}/api/opportunities?limit=10000`, { headers }),
  ]);

  if (!petRes.ok) redirect(302, "/pets");
  const petRaw: unknown = await petRes.json();
  const pet = isObjData(petRaw) ? petRaw.data : null;
  if (pet == null) redirect(302, "/pets");

  let allHumans: unknown[] = [];
  if (humansRes.ok) {
    const humansRaw: unknown = await humansRes.json();
    allHumans = isListData(humansRaw) ? humansRaw.data : [];
  }

  let petOpportunities: unknown[] = [];
  if (petOppsRes.ok) {
    const petOppsRaw: unknown = await petOppsRes.json();
    petOpportunities = isListData(petOppsRaw) ? petOppsRaw.data : [];
  }

  let allOpportunities: unknown[] = [];
  if (allOppsRes.ok) {
    const allOppsRaw: unknown = await allOppsRes.json();
    if (isListData(allOppsRaw)) {
      allOpportunities = allOppsRaw.data;
    }
  }

  return { pet, allHumans, petOpportunities, allOpportunities };
};

export const actions = {
  linkOpportunity: async ({ request, cookies, params }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const headers = {
      "Content-Type": "application/json",
      Cookie: `humans_session=${sessionToken ?? ""}`,
    };

    const opportunityId = formStr(form.get("opportunityId"));
    const petHumanId = formStr(form.get("petHumanId"));
    const petId = params.id ?? "";

    if (opportunityId === "") {
      return fail(400, { error: "Please select an opportunity" });
    }

    // Auto-link owner: check if pet's owner is already linked to this opportunity
    if (petHumanId !== "") {
      const oppRes = await fetch(`${PUBLIC_API_URL}/api/opportunities/${opportunityId}`, {
        headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
      });

      if (oppRes.ok) {
        const oppRaw: unknown = await oppRes.json();
        if (isObjData(oppRaw)) {
          const linkedHumans = Array.isArray(oppRaw.data.linkedHumans) ? oppRaw.data.linkedHumans : [];
          const ownerAlreadyLinked = linkedHumans.some((h: unknown) => {
            if (typeof h === "object" && h !== null && "humanId" in h) {
              return (h as Record<string, unknown>).humanId === petHumanId;
            }
            return false;
          });

          if (!ownerAlreadyLinked) {
            const linkRes = await fetch(`${PUBLIC_API_URL}/api/opportunities/${opportunityId}/humans`, {
              method: "POST",
              headers,
              body: JSON.stringify({ humanId: petHumanId }),
            });
            if (!linkRes.ok) {
              const linkBody: unknown = await linkRes.json();
              return failFromApi(linkBody, linkRes.status, "Failed to auto-link pet owner to opportunity");
            }
          }
        }
      }
    }

    // Link the pet to the opportunity
    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities/${opportunityId}/pets`, {
      method: "POST",
      headers,
      body: JSON.stringify({ petId }),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to link opportunity");
    }

    return { success: true };
  },

  unlinkOpportunity: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");
    const opportunityId = formStr(form.get("opportunityId"));
    const linkId = formStr(form.get("linkId"));

    const res = await fetch(`${PUBLIC_API_URL}/api/opportunities/${opportunityId}/pets/${linkId}`, {
      method: "DELETE",
      headers: {
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to unlink opportunity");
    }

    return { success: true };
  },
};
