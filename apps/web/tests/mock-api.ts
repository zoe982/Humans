/**
 * Lightweight mock API server for Playwright E2E tests.
 * Returns canned responses so the SvelteKit app can render
 * authenticated pages without hitting the real API.
 */
import http from "node:http";

const PORT = Number(process.env["MOCK_API_PORT"] ?? 4799);

const ROUTES: Record<string, () => unknown> = {
  "GET /auth/me": () => ({
    user: {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: null,
      role: "admin",
    },
  }),
  "GET /api/humans": () => ({ data: [] }),
  "GET /api/activities": () => ({ data: [] }),
  "GET /api/geo-interests": () => ({
    data: [
      {
        id: "gi-1",
        city: "Paris",
        country: "France",
        humanCount: 3,
        expressionCount: 5,
        createdAt: "2025-01-01T00:00:00Z",
      },
    ],
  }),
  "GET /api/geo-interest-expressions": () => ({ data: [] }),
  "GET /api/flights": () => ({ data: [] }),
  "GET /api/leads": () => ({ data: [] }),
  "GET /api/leads/route-signups": () => ({ data: [] }),
  "GET /api/reports": () => ({ data: [] }),
  "GET /api/admin/audit-log": () => ({ data: [] }),
  "GET /api/admin/colleagues": () => ({ data: [] }),
  "POST /api/geo-interests": () => ({
    data: { id: "gi-new", city: "Test", country: "Testland", humanCount: 0, expressionCount: 0, createdAt: new Date().toISOString() },
  }),
};

const server = http.createServer((req, res) => {
  const key = `${req.method} ${req.url?.split("?")[0]}`;
  const handler = ROUTES[key];

  // Also match wildcard patterns like GET /api/humans/:id/pets
  const wildcardMatch = !handler && Object.keys(ROUTES).find((k) => {
    const [method, path] = k.split(" ");
    return method === req.method && req.url?.startsWith(path ?? "");
  });

  const body = handler ? handler() : wildcardMatch ? ROUTES[wildcardMatch]!() : { data: [] };

  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(body));
});

server.listen(PORT, () => {
  console.log(`Mock API running on http://localhost:${PORT}`);
});
