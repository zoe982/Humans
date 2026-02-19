import { vi } from "vitest";

/**
 * Creates a mock SvelteKit RequestEvent for testing load functions and form actions.
 */
export function mockEvent(options: {
  user?: { id: string; email: string; role: string; name: string } | null;
  sessionToken?: string;
  url?: string;
  formData?: Record<string, string | string[]>;
  fetch?: ReturnType<typeof vi.fn>;
} = {}) {
  const {
    user = { id: "user-1", email: "test@example.com", role: "agent", name: "Test User" },
    sessionToken = "test-session-token",
    url: urlString = "http://localhost/",
    formData: formDataEntries = {},
  } = options;

  const cookies = {
    get: vi.fn((name: string) => (name === "humans_session" ? sessionToken : undefined)),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
    serialize: vi.fn(() => ""),
  };

  const urlObj = new URL(urlString);

  const form = new FormData();
  for (const [key, value] of Object.entries(formDataEntries)) {
    if (Array.isArray(value)) {
      for (const v of value) form.append(key, v);
    } else {
      form.append(key, value);
    }
  }

  const request = new Request(urlString, {
    method: "POST",
    body: form,
  });
  // Override formData to return our constructed FormData
  request.formData = vi.fn(async () => form);

  const mockFetch = options.fetch ?? vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));

  return {
    locals: { user },
    cookies,
    url: urlObj,
    params: {} as Record<string, string>,
    request,
    fetch: mockFetch,
    // Matching SvelteKit's RequestEvent shape
    getClientAddress: () => "127.0.0.1",
    platform: {},
    route: { id: "/" },
    isDataRequest: false,
    isSubRequest: false,
    setHeaders: vi.fn(),
  };
}

/**
 * Helper to create a mock fetch that returns different responses for different URL patterns.
 */
export function createMockFetch(responses: Record<string, { status?: number; body?: unknown }>) {
  return vi.fn(async (url: string | URL | Request) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    for (const [pattern, config] of Object.entries(responses)) {
      if (urlStr.includes(pattern)) {
        return new Response(JSON.stringify(config.body ?? { data: [] }), {
          status: config.status ?? 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  });
}
