let online = true;

function handleOnline(): void {
  online = true;
}

function handleOffline(): void {
  online = false;
}

export function getOnlineStatus(): boolean {
  return online;
}

export function initOnlineMonitor(): void {
  if (typeof window === "undefined") return;
  online = typeof navigator !== "undefined" ? navigator.onLine : true;
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
}

export function destroyOnlineMonitor(): void {
  if (typeof window === "undefined") return;
  window.removeEventListener("online", handleOnline);
  window.removeEventListener("offline", handleOffline);
  online = true;
}
