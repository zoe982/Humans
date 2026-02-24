export interface ChangeEvent {
  actorId: string;
  path: string;
  method: string;
  timestamp: string;
}

interface HubEnv {
  SESSIONS: KVNamespace;
}

/**
 * Durable Object that broadcasts change events to connected WebSocket clients.
 * Uses WebSocket hibernation for cost efficiency — the DO sleeps when idle
 * but WebSocket connections stay alive at the edge.
 */
export class RealtimeHub implements DurableObject {
  private readonly state: DurableObjectState;
  private readonly env: HubEnv;

  constructor(state: DurableObjectState, env: HubEnv) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade request from clients
    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      return this.handleWebSocket(url);
    }

    // Internal POST from notifyRealtime() to broadcast events
    if (request.method === "POST") {
      const event = await request.json<ChangeEvent>();
      const message = JSON.stringify(event);
      for (const ws of this.state.getWebSockets()) {
        try {
          ws.send(message);
        } catch {
          /* client disconnected, ignore */
        }
      }
      return new Response("OK");
    }

    return new Response("Method Not Allowed", { status: 405 });
  }

  private async handleWebSocket(url: URL): Promise<Response> {
    const token = url.searchParams.get("token");
    if (token === null || token === "") {
      return new Response("Missing token", { status: 401 });
    }

    const session = await this.env.SESSIONS.get(`session:${token}`);
    if (session === null) {
      return new Response("Invalid session", { status: 401 });
    }

    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  webSocketMessage(): void {
    // Clients don't send messages — ignore
  }

  webSocketClose(): void {
    // No cleanup needed
  }
}
