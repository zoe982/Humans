import PartySocket from "partysocket";
import { browser } from "$app/environment";
import { invalidateAll } from "$app/navigation";
import { PUBLIC_API_URL } from "$env/static/public";

let socket: PartySocket | null = null;
let currentUserId: string | null = null;
let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
let hasConnectedBefore = false;

function scheduleInvalidation() {
  if (invalidateTimer) return;
  invalidateTimer = setTimeout(() => {
    invalidateTimer = null;
    invalidateAll();
  }, 300);
}

export function initRealtime(userId: string, sessionToken: string) {
  if (!browser || socket) return;
  currentUserId = userId;

  const host = PUBLIC_API_URL
    ? new URL(PUBLIC_API_URL).host
    : window.location.host;

  socket = new PartySocket({
    host,
    party: "realtime-hub",
    room: "global",
    query: { token: sessionToken },
  });

  socket.addEventListener("open", () => {
    if (hasConnectedBefore) invalidateAll();
    hasConnectedBefore = true;
  });

  socket.addEventListener("message", (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string);
      if (data.actorId === currentUserId) return;
      scheduleInvalidation();
    } catch {
      /* ignore malformed messages */
    }
  });
}

export function destroyRealtime() {
  socket?.close();
  socket = null;
  currentUserId = null;
  hasConnectedBefore = false;
  if (invalidateTimer) {
    clearTimeout(invalidateTimer);
    invalidateTimer = null;
  }
}
