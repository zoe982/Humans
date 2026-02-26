import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { isObjData, isListData, fetchList, fetchConfigs } from "$lib/server/api";
import { humanListItemSchema, accountListItemSchema } from "@humans/shared";

export const load = async ({ locals, cookies, params }: RequestEvent): Promise<{
  agreement: Record<string, unknown>;
  allHumans: unknown[];
  allAccounts: unknown[];
  agreementTypes: unknown[];
  documents: unknown[];
}> => {
  if (locals.user == null) redirect(302, "/login");

  const sessionToken = cookies.get("humans_session") ?? "";
  const id = params.id ?? "";

  const agreementRes = await fetch(`${PUBLIC_API_URL}/api/agreements/${id}`, {
    headers: { Cookie: `humans_session=${sessionToken}` },
  });

  if (!agreementRes.ok) redirect(302, "/agreements");
  const agreementRaw: unknown = await agreementRes.json();
  const agreement = isObjData(agreementRaw) ? agreementRaw.data : null;
  if (agreement == null) redirect(302, "/agreements");

  const [allHumans, allAccounts, configs, documentsRes] = await Promise.all([
    fetchList(`${PUBLIC_API_URL}/api/humans`, sessionToken, { schema: humanListItemSchema, schemaName: "humanListItem" }),
    fetchList(`${PUBLIC_API_URL}/api/accounts`, sessionToken, { schema: accountListItemSchema, schemaName: "accountListItem" }),
    fetchConfigs(sessionToken, ["agreement-types"]),
    fetch(`${PUBLIC_API_URL}/api/documents?entityType=agreement&entityId=${id}`, {
      headers: { Cookie: `humans_session=${sessionToken}` },
    }),
  ]);

  let documents: unknown[] = [];
  if (documentsRes.ok) {
    const docsRaw: unknown = await documentsRes.json();
    if (isListData(docsRaw)) {
      documents = docsRaw.data;
    }
  }

  return {
    agreement,
    allHumans,
    allAccounts,
    agreementTypes: configs["agreement-types"] ?? [],
    documents,
  };
};
