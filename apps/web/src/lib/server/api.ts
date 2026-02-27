import { fail } from "@sveltejs/kit";
import type { ActionFailure } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { extractApiErrorInfo } from "$lib/api";
import { validateResponse } from "$lib/server/validate-response";
import type { z } from "zod";

export function isListData(value: unknown): value is { data: unknown[] } {
  return typeof value === "object" && value !== null && "data" in value && Array.isArray((value as { data: unknown }).data);
}

export function isObjData(value: unknown): value is { data: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "data" in value;
}

export function failFromApi(resBody: unknown, status: number, fallback: string): ActionFailure<{ error: string; code?: string; requestId?: string; details?: unknown }> {
  const info = extractApiErrorInfo(resBody, fallback);
  const body = typeof resBody === "object" && resBody !== null ? resBody : {};
  const details = "details" in body ? (body as { details: unknown }).details : undefined;
  return fail(status, { error: info.message, code: info.code, requestId: info.requestId, details });
}

export function authHeaders(sessionToken: string): { Cookie: string } {
  return { Cookie: `humans_session=${sessionToken}` };
}

interface SchemaOptions<S extends z.ZodTypeAny> {
  schema: S;
  schemaName: string;
}

export async function fetchList(url: string, sessionToken: string): Promise<unknown[]>;
export async function fetchList<S extends z.ZodTypeAny>(url: string, sessionToken: string, options: SchemaOptions<S>): Promise<z.infer<S>[]>;
export async function fetchList(
  url: string,
  sessionToken: string,
  options?: SchemaOptions<z.ZodTypeAny>,
): Promise<unknown[]> {
  try {
    const res = await fetch(url, { headers: authHeaders(sessionToken) });
    if (!res.ok) { await res.body?.cancel(); return []; }
    const raw: unknown = await res.json().catch(() => null);
    if (!isListData(raw)) return [];
    if (options !== undefined) {
      /* eslint-disable @typescript-eslint/no-unsafe-return -- validateResponse returns z.infer<T> which resolves to any in generic context */
      return raw.data.map((item: unknown) =>
        validateResponse(options.schema, item, {
          url,
          schemaName: options.schemaName,
          strict: import.meta.env.DEV,
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-return */
    }
    return raw.data;
  } catch { return []; }
}

export async function fetchObj(url: string, sessionToken: string): Promise<Record<string, unknown> | null>;
export async function fetchObj<S extends z.ZodTypeAny>(url: string, sessionToken: string, options: SchemaOptions<S>): Promise<z.infer<S> | null>;
export async function fetchObj(
  url: string,
  sessionToken: string,
  options?: SchemaOptions<z.ZodTypeAny>,
): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: authHeaders(sessionToken) });
    if (!res.ok) { await res.body?.cancel(); return null; }
    const raw: unknown = await res.json().catch(() => null);
    if (!isObjData(raw)) return null;
    if (options !== undefined) {
      return validateResponse(options.schema, raw.data, {
        url,
        schemaName: options.schemaName,
        strict: import.meta.env.DEV,
      }) as unknown;
    }
    return raw.data;
  } catch { return null; }
}

type BatchConfigResult = Record<string, unknown[]>;

function isBatchConfigResponse(value: unknown): value is { data: BatchConfigResult } {
  return typeof value === "object" && value !== null && "data" in value && typeof (value as { data: unknown }).data === "object" && (value as { data: unknown }).data !== null;
}

export async function fetchConfigs(sessionToken: string, types?: string[]): Promise<BatchConfigResult> {
  try {
    const params = types != null ? `?types=${types.join(",")}` : "";
    const res = await fetch(`${PUBLIC_API_URL}/api/admin/account-config/batch${params}`, {
      headers: authHeaders(sessionToken),
    });
    if (!res.ok) { await res.body?.cancel(); return {}; }
    const raw: unknown = await res.json();
    if (isBatchConfigResponse(raw)) {
      return raw.data;
    }
    return {};
  } catch { return {}; }
}
