import { redirect, fail } from "@sveltejs/kit";
import type { RequestEvent, ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { fetchList, fetchConfigs, failFromApi } from "$lib/server/api";

function isDataWithId(value: unknown): value is { data: { id: string } } {
  return typeof value === "object" && value !== null && "data" in value;
}

export const load = async ({ locals, cookies }: RequestEvent): Promise<{ allHumans: unknown[]; allAccounts: unknown[]; agreementTypes: unknown[] }> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";

  const [allHumans, allAccounts, configs] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/humans`, sessionToken),
    fetchList(`${PUBLIC_API_URL}/api/accounts`, sessionToken),
    fetchConfigs(sessionToken, ["agreement-types"]),
  ]);

  return {
    allHumans,
    allAccounts,
    agreementTypes: (configs["agreement-types"] as unknown[]) ?? [],
  };
};

export const actions = {
  create: async ({ request, cookies }: RequestEvent): Promise<ActionFailure<{ error: string; code?: string; requestId?: string }> | { success: true }> => {
    const form = await request.formData();
    const sessionToken = cookies.get("humans_session");

    const humanIdRaw = form.get("humanId");
    const accountIdRaw = form.get("accountId");
    const typeIdRaw = form.get("typeId");
    const activationDateRaw = form.get("activationDate");
    const notesRaw = form.get("notes");

    const payload = {
      title: form.get("title"),
      typeId: typeof typeIdRaw === "string" && typeIdRaw !== "" ? typeIdRaw : undefined,
      humanId: typeof humanIdRaw === "string" && humanIdRaw !== "" ? humanIdRaw : undefined,
      accountId: typeof accountIdRaw === "string" && accountIdRaw !== "" ? accountIdRaw : undefined,
      activationDate: typeof activationDateRaw === "string" && activationDateRaw !== "" ? activationDateRaw : undefined,
      notes: typeof notesRaw === "string" && notesRaw !== "" ? notesRaw : undefined,
    };

    const res = await fetch(`${PUBLIC_API_URL}/api/agreements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `humans_session=${sessionToken ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const resBody: unknown = await res.json();
      return failFromApi(resBody, res.status, "Failed to create agreement");
    }

    const created: unknown = await res.json();
    if (!isDataWithId(created)) {
      return fail(500, { error: "Unexpected response" });
    }

    // Upload file if present
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("entityType", "agreement");
      uploadForm.append("entityId", created.data.id);

      await fetch(`${PUBLIC_API_URL}/api/documents/upload`, {
        method: "POST",
        headers: {
          Cookie: `humans_session=${sessionToken ?? ""}`,
        },
        body: uploadForm,
      });
    }

    redirect(302, `/agreements/${created.data.id}`);
  },
};
