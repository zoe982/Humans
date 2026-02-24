import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { PUBLIC_API_URL } from "$env/static/public";

interface ApiSearchResponse {
  humans?: unknown[];
}

function isApiSearchResponse(value: unknown): value is ApiSearchResponse {
  return typeof value === "object" && value !== null;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  const q = url.searchParams.get("q") ?? "";
  if (q.trim().length === 0) {
    return json({ humans: [] });
  }

  const sessionToken = cookies.get("humans_session");
  const res = await fetch(`${PUBLIC_API_URL}/api/search?q=${encodeURIComponent(q)}`, {
    headers: { Cookie: `humans_session=${sessionToken ?? ""}` },
  });

  if (!res.ok) {
    return json({ humans: [] });
  }

  const raw: unknown = await res.json();
  const data: ApiSearchResponse = isApiSearchResponse(raw) ? raw : {};
  return json({ humans: data.humans ?? [] });
};
