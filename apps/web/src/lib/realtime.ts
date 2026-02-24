import PartySocket from "partysocket";
import { browser } from "$app/environment";
import { invalidateAll } from "$app/navigation";
import { PUBLIC_API_URL } from "$env/static/public";

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
    if (hasConnectedBefore) void invalidateAll();
    hasConnectedBefore = true;
  });

  socket.addEventListener("message", (event: MessageEvent) => {
    try {
      const raw: unknown = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (typeof raw === "object" && raw !== null && "actorId" in raw && (raw as { actorId: unknown }).actorId === currentUserId) return;
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
