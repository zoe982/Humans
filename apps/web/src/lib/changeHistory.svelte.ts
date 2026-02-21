import { api } from "$lib/api";

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  createdAt: string;
  colleagueName: string | null;
};

export function createChangeHistoryLoader(entityType: string, entityId: string) {
  let historyEntries = $state<AuditEntry[]>([]);
  let historyLoaded = $state(false);

  async function loadHistory() {
    if (historyLoaded) return;
    try {
      const result = await api(`/api/audit-log`, {
        params: { entityType, entityId },
      }) as { data: AuditEntry[] };
      historyEntries = result.data;
      historyLoaded = true;
    } catch {
      historyEntries = [];
    }
  }

  function resetHistory() {
    historyLoaded = false;
  }

  return {
    get historyEntries() { return historyEntries; },
    get historyLoaded() { return historyLoaded; },
    loadHistory,
    resetHistory,
  };
}
