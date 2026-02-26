import PartySocket from "partysocket";
import { browser } from "$app/environment";
import { invalidateAll } from "$app/navigation";
import { PUBLIC_API_URL } from "$env/static/public";
import { handleRealtimeMessage, type RealtimeMessage } from "$lib/data/realtime-handler";
import { syncAll } from "$lib/data/sync";

let socket: PartySocket | null = null;
let currentUserId: string | null = null;
let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
let hasConnectedBefore = false;

function scheduleInvalidation(): void {
  if (invalidateTimer != null) return;
  invalidateTimer = setTimeout(() => {
    invalidateTimer = null;
    void invalidateAll();
  }, 300);
}

function isRealtimeMessage(raw: unknown): raw is RealtimeMessage {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "method" in raw &&
    "path" in raw &&
    "actorId" in raw &&
    typeof (raw as { method: unknown }).method === "string" &&
    typeof (raw as { path: unknown }).path === "string" &&
    typeof (raw as { actorId: unknown }).actorId === "string"
  );
}

export function initRealtime(userId: string, sessionToken: string): void {
  if (!browser || socket != null) return;
  currentUserId = userId;

  const host = PUBLIC_API_URL !== ""
    ? new URL(PUBLIC_API_URL).host
    : window.location.host;

  socket = new PartySocket({
    host,
    party: "realtime-hub",
    room: "global",
    query: { token: sessionToken },
  });

  socket.addEventListener("open", () => {
    if (hasConnectedBefore) {
      // Reconnected after disconnect — debounce to avoid rapid reconnect storms
      setTimeout(() => void syncAll(), 2000);
    }
    hasConnectedBefore = true;
  });

  socket.addEventListener("message", (event: MessageEvent) => {
    try {
      const raw: unknown = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

      if (isRealtimeMessage(raw)) {
        const result = handleRealtimeMessage(raw, currentUserId ?? "");
        if (result === "unknown") {
          // Unknown path — fallback to invalidateAll for safety
          scheduleInvalidation();
        }
        // "handled" or "ignored" — no further action needed
        return;
      }

      // Non-standard message format — fallback
      scheduleInvalidation();
    } catch {
      /* ignore malformed messages */
    }
  });
}

export function destroyRealtime(): void {
  socket?.close();
  socket = null;
  currentUserId = null;
  hasConnectedBefore = false;
  if (invalidateTimer != null) {
    clearTimeout(invalidateTimer);
    invalidateTimer = null;
  }
}
