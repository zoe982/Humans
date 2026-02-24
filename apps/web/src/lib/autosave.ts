import { api, ApiRequestError } from "$lib/api";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ErrorInfo {
  message: string;
  code?: string;
  requestId?: string;
}

interface AutoSaverOptions {
  endpoint: string;
  debounceMs?: number;
  onStatusChange?: (status: SaveStatus) => void;
  onSaved?: (result: { auditEntryId?: string }) => void;
  onError?: (error: string, info?: ErrorInfo) => void;
}

interface SaveResult {
  data?: Record<string, unknown>;
  auditEntryId?: string;
}

function isSaveResult(value: unknown): value is SaveResult {
  return typeof value === "object" && value !== null;
}

export function createAutoSaver(options: AutoSaverOptions): {
  init: (currentValues: Record<string, unknown>) => void;
  save: (payload: Record<string, unknown>) => void;
  saveImmediate: (payload: Record<string, unknown>) => void;
  destroy: () => void;
} {
  const { endpoint, debounceMs = 1000, onStatusChange, onSaved, onError } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let baseline: Record<string, unknown> = {};

  function init(currentValues: Record<string, unknown>): void {
    baseline = { ...currentValues };
  }

  async function doSave(payload: Record<string, unknown>): Promise<void> {
    onStatusChange?.("saving");
    try {
      const raw = await api(endpoint, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const result: SaveResult = isSaveResult(raw) ? raw : {};

      // Update baseline to new values
      baseline = { ...baseline, ...payload };
      onStatusChange?.("saved");
      onSaved?.({ auditEntryId: result.auditEntryId });
    } catch (err) {
      onStatusChange?.("error");
      if (err instanceof ApiRequestError) {
        onError?.(err.message, { message: err.message, code: err.code, requestId: err.requestId });
      } else {
        onError?.(err instanceof Error ? err.message : "Save failed");
      }
    }
  }

  function save(payload: Record<string, unknown>): void {
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void doSave(payload);
    }, debounceMs);
  }

  function saveImmediate(payload: Record<string, unknown>): void {
    if (timer != null) clearTimeout(timer);
    timer = null;
    void doSave(payload);
  }

  function destroy(): void {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return { init, save, saveImmediate, destroy };
}
