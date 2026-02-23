import type { Context } from "hono";
import type { AppContext } from "../types";
import type { ChangeEvent } from "./hub";

export function notifyRealtime(
  c: Context<AppContext>,
  event: Omit<ChangeEvent, "actorId" | "timestamp">,
): void {
  const session = c.get("session");
  if (!session) return;
  if (!c.env.RealtimeHub) return;

  const payload: ChangeEvent = {
    ...event,
    actorId: session.colleagueId,
    timestamp: new Date().toISOString(),
  };

  c.executionCtx.waitUntil(
    (async () => {
      try {
        const stub = c.env.RealtimeHub.get(
          c.env.RealtimeHub.idFromName("global"),
        );
        await stub.fetch("https://do-internal/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("[realtime] notify failed:", err);
      }
    })(),
  );
}
