import { api } from "$lib/api";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaverOptions {
  endpoint: string;
  debounceMs?: number;
  onStatusChange?: (status: SaveStatus) => void;
  onSaved?: (result: { auditEntryId?: string }) => void;
  onError?: (error: string) => void;
}

interface SaveResult {
  data?: Record<string, unknown>;
  auditEntryId?: string;
}

export function createAutoSaver(options: AutoSaverOptions) {
  const { endpoint, debounceMs = 1000, onStatusChange, onSaved, onError } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let baseline: Record<string, unknown> = {};

  function init(currentValues: Record<string, unknown>) {
    baseline = { ...currentValues };
  }

  async function doSave(payload: Record<string, unknown>) {
    onStatusChange?.("saving");
    try {
      const result = (await api(endpoint, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })) as SaveResult;

      // Update baseline to new values
      baseline = { ...baseline, ...payload };
      onStatusChange?.("saved");
      onSaved?.({ auditEntryId: result.auditEntryId });
    } catch (err) {
      onStatusChange?.("error");
      onError?.(err instanceof Error ? err.message : "Save failed");
    }
  }

  function save(payload: Record<string, unknown>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      doSave(payload);
    }, debounceMs);
  }

  function saveImmediate(payload: Record<string, unknown>) {
    if (timer) clearTimeout(timer);
    timer = null;
    doSave(payload);
  }

  function destroy() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return { init, save, saveImmediate, destroy };
}
