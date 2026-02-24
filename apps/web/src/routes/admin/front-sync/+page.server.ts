import { redirect } from "@sveltejs/kit";
import type { RequestEvent } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

interface SyncRun {
  id: string;
  displayId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalMessages: number;
  imported: number;
  skipped: number;
  unmatched: number;
  errorCount: number;
  linkedToHumans: number;
  linkedToAccounts: number;
  linkedToRouteSignups: number;
  linkedToBookings: number;
  linkedToColleagues: number;
  linkedToGeneralLeads: number;
  unmatchedContacts: string | null;
  initiatedByColleagueId: string | null;
  initiatedByName: string | null;
}

interface SyncResult {
  total: number;
  imported: number;
  skipped: number;
  unmatched: number;
  errors: string[];
  unmatchedContacts: {
    handle: string;
    name: string | null;
    conversationId: string;
    conversationSubject: string;
    type: string;
    messageCount: number;
  }[];
  nextCursor: string | null;
  syncRunId: string;
}

function isSyncRunData(value: unknown): value is { data: SyncRun[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  );
}

function isSyncResultData(value: unknown): value is { data: SyncResult } {
  return typeof value === "object" && value !== null && "data" in value;
}

function isRevertResultData(value: unknown): value is { data: { deleted: number; skipped: number } } {
  return typeof value === "object" && value !== null && "data" in value;
}

function extractErrorMessage(raw: unknown, fallback: string): string {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "error" in raw
  ) {
    const err = (raw as Record<string, unknown>)["error"];
    if (typeof err === "string") {
      return err;
    }
  }
  return fallback;
}

function getFormString(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : "";
}

export const load = async ({ locals, cookies }: RequestEvent): Promise<{ syncRuns: SyncRun[] }> => {
  if (locals.user == null) redirect(302, "/login");
  if (locals.user.role !== "admin") redirect(302, "/dashboard");

  const sessionToken = cookies.get("humans_session");

  const res = await fetch(
    `${PUBLIC_API_URL}/api/admin/front/sync-runs`,
    { headers: { Cookie: `humans_session=${sessionToken ?? ""}` } },
  );

  let syncRuns: SyncRun[] = [];
  if (res.ok) {
    const raw: unknown = await res.json();
    if (isSyncRunData(raw)) {
      syncRuns = raw.data;
    }
  }

  return { syncRuns };
};

export const actions = {
  sync: async ({ locals, cookies, request }: RequestEvent): Promise<{ error: string } | { result: SyncResult }> => {
    if (locals.user == null) redirect(302, "/login");
    if (locals.user.role !== "admin") redirect(302, "/dashboard");

    const sessionToken = cookies.get("humans_session");
    const formData = await request.formData();
    const cursor = getFormString(formData, "cursor");

    const params = new URLSearchParams({ limit: "20" });
    if (cursor !== "") params.set("cursor", cursor);

    const res = await fetch(
      `${PUBLIC_API_URL}/api/admin/front/sync?${params.toString()}`,
      {
        method: "POST",
        headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
      },
    );

    if (!res.ok) {
      const raw: unknown = await res.json().catch(() => ({}));
      const errMsg = extractErrorMessage(raw, `Sync failed (HTTP ${res.status.toString()})`);
      return { error: errMsg };
    }

    const json: unknown = await res.json();
    if (!isSyncResultData(json)) {
      return { error: "Unexpected response from sync" };
    }
    return { result: json.data };
  },
  revert: async ({ locals, cookies, request }: RequestEvent): Promise<{ revertError: string } | { revertResult: { deleted: number; skipped: number } }> => {
    if (locals.user == null) redirect(302, "/login");
    if (locals.user.role !== "admin") redirect(302, "/dashboard");

    const sessionToken = cookies.get("humans_session");
    const formData = await request.formData();
    const syncRunId = getFormString(formData, "syncRunId");

    const res = await fetch(
      `${PUBLIC_API_URL}/api/admin/front/sync-runs/${syncRunId}/revert`,
      {
        method: "POST",
        headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
      },
    );

    if (!res.ok) {
      const raw: unknown = await res.json().catch(() => ({}));
      const errMsg = extractErrorMessage(raw, `Revert failed (HTTP ${res.status.toString()})`);
      return { revertError: errMsg };
    }

    const json: unknown = await res.json();
    if (!isRevertResultData(json)) {
      return { revertError: "Unexpected response from revert" };
    }
    return { revertResult: json.data };
  },
};
