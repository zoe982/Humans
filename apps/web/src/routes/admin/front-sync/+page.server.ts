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
}

function isSyncRunData(value: unknown): value is { data: SyncRun[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  );
}

export const load = async ({ locals, cookies }: RequestEvent) => {
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
  sync: async ({ locals, cookies, request }: RequestEvent) => {
    if (locals.user == null) redirect(302, "/login");
    if (locals.user.role !== "admin") redirect(302, "/dashboard");

    const sessionToken = cookies.get("humans_session");
    const formData = await request.formData();
    const cursor = formData.get("cursor") as string | null;

    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(
      `${PUBLIC_API_URL}/api/admin/front/sync?${params.toString()}`,
      {
        method: "POST",
        headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
      },
    );

    if (!res.ok) {
      const raw: unknown = await res.json().catch(() => ({}));
      const errMsg =
        typeof raw === "object" && raw !== null && "error" in raw
          ? String((raw as { error: string }).error)
          : `Sync failed (HTTP ${String(res.status)})`;
      return { error: errMsg };
    }

    const json = (await res.json()) as {
      data: {
        total: number;
        imported: number;
        skipped: number;
        unmatched: number;
        errors: string[];
        nextCursor: string | null;
        syncRunId: string;
      };
    };
    return { result: json.data };
  },
  revert: async ({ locals, cookies, request }: RequestEvent) => {
    if (locals.user == null) redirect(302, "/login");
    if (locals.user.role !== "admin") redirect(302, "/dashboard");

    const sessionToken = cookies.get("humans_session");
    const formData = await request.formData();
    const syncRunId = formData.get("syncRunId") as string;

    const res = await fetch(
      `${PUBLIC_API_URL}/api/admin/front/sync-runs/${syncRunId}/revert`,
      {
        method: "POST",
        headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
      },
    );

    if (!res.ok) {
      const raw: unknown = await res.json().catch(() => ({}));
      const errMsg =
        typeof raw === "object" && raw !== null && "error" in raw
          ? String((raw as { error: string }).error)
          : `Revert failed (HTTP ${String(res.status)})`;
      return { revertError: errMsg };
    }

    const json = (await res.json()) as {
      data: { deleted: number; skipped: number };
    };
    return { revertResult: json.data };
  },
};
