import { parseRealtimePath } from "./registry";
import { getStore } from "./stores.svelte";
import { syncEntity, fetchSingleRecord } from "./sync";

export interface RealtimeMessage {
  method: string;
  path: string;
  actorId: string;
}

export function handleRealtimeMessage(
  message: RealtimeMessage,
  currentUserId: string,
): "handled" | "ignored" | "unknown" {
  if (message.actorId === currentUserId) return "ignored";

  const parsed = parseRealtimePath(message.path);
  if (parsed === null) return "unknown";

  const { entityType, id } = parsed;

  if (message.method === "DELETE" && id !== undefined) {
    const store = getStore(entityType);
    store.removeItem(id);
    return "handled";
  }

  if ((message.method === "PATCH" || message.method === "PUT") && id !== undefined) {
    void fetchSingleRecord(entityType, id);
    return "handled";
  }

  // POST or other methods: resync the whole entity type
  void syncEntity(entityType);
  return "handled";
}
