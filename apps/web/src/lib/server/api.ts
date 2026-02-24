import { fail } from "@sveltejs/kit";
import type { ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiErrorInfo } from "$lib/api";

export function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export function isObjData(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value;
}

export function failFromApi(resBody: unknown, status: number, fallback: string): ActionFailure<{ error: string; code?: string; requestId?: string }> {
  const info = extractApiErrorInfo(resBody, fallback);
  return fail(status, { error: info.message, code: info.code, requestId: info.requestId });
}

export function authHeaders(sessionToken: string): { Cookie: string } {
  return { Cookie: `humans_session=${sessionToken}` };
}

export async function fetchList(url: string, sessionToken: string): Promise<unknown[]> {
  const res = await fetch(url, { headers: authHeaders(sessionToken) });
  if (!res.ok) return [];
  const raw: unknown = await res.json();
  return isListData(raw) ? raw.data : [];
}

export async function fetchObj(url: string, sessionToken: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(url, { headers: authHeaders(sessionToken) });
  if (!res.ok) return null;
  const raw: unknown = await res.json();
  return isObjData(raw) ? raw.data : null;
}

type BatchConfigResult = Record<string, unknown[]>;

function isBatchConfigResponse(value: unknown): value is { data: BatchConfigResult } {
  return typeof value === "object" && value !== null && "data" in value && typeof (value as { data: unknown }).data === "object" && (value as { data: unknown }).data !== null;
}

export async function fetchConfigs(sessionToken: string, types?: string[]): Promise<BatchConfigResult> {
  const params = types != null ? `?types=${types.join(",")}` : "";
  const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/batch${params}`, {
    headers: authHeaders(sessionToken),
  });
  if (!res.ok) return {};
  const raw: unknown = await res.json();
  if (isBatchConfigResponse(raw)) {
    return raw.data;
  }
  return {};
}
