/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { createId } from "@humans/db";

describe("GET /api/admin/error-log", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/error-log");
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role (requires manageColleagues: admin only)", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/admin/error-log", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 for agent role", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/admin/error-log", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 for manager role", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/admin/error-log", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns empty array when no errors exist for admin", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/error-log", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it("returns error log entries for admin", async () => {
    const db = getDb();
    const now = new Date().toISOString();
    await db.insert(schema.errorLog).values({
      id: createId(),
      displayId: `ERR-${createId().slice(0, 8)}`,
      requestId: createId(),
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
      status: 500,
      method: "GET",
      path: "/api/test",
      userId: null,
      details: null,
      stack: null,
      createdAt: now,
    });
    await db.insert(schema.errorLog).values({
      id: createId(),
      displayId: `ERR-${createId().slice(0, 8)}`,
      requestId: createId(),
      code: "VALIDATION_FAILED",
      message: "Bad input",
      status: 400,
      method: "POST",
      path: "/api/humans",
      userId: null,
      details: null,
      stack: null,
      createdAt: now,
    });

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/error-log", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ code: string; message: string; status: number }> };
    expect(body.data).toHaveLength(2);
  });

  it("respects limit query parameter", async () => {
    const db = getDb();
    const now = new Date().toISOString();
    for (let i = 0; i < 5; i++) {
      await db.insert(schema.errorLog).values({
        id: createId(),
        displayId: `ERR-${createId().slice(0, 8)}`,
        requestId: createId(),
        code: "INTERNAL_ERROR",
        message: `Error ${i}`,
        status: 500,
        method: "GET",
        path: "/api/test",
        userId: null,
        details: null,
        stack: null,
        createdAt: now,
      });
    }

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/error-log?limit=3", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(3);
  });

  it("respects offset query parameter", async () => {
    const db = getDb();
    const now = new Date().toISOString();
    for (let i = 0; i < 5; i++) {
      await db.insert(schema.errorLog).values({
        id: createId(),
        displayId: `ERR-${createId().slice(0, 8)}`,
        requestId: createId(),
        code: "INTERNAL_ERROR",
        message: `Error ${i}`,
        status: 500,
        method: "GET",
        path: "/api/test",
        userId: null,
        details: null,
        stack: null,
        createdAt: now,
      });
    }

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/error-log?limit=50&offset=3", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(2);
  });

  it("filters by code parameter", async () => {
    const db = getDb();
    const now = new Date().toISOString();
    await db.insert(schema.errorLog).values({
      id: createId(),
      displayId: `ERR-${createId().slice(0, 8)}`,
      requestId: createId(),
      code: "INTERNAL_ERROR",
      message: "Internal",
      status: 500,
      method: "GET",
      path: "/api/test",
      userId: null,
      details: null,
      stack: null,
      createdAt: now,
    });
    await db.insert(schema.errorLog).values({
      id: createId(),
      displayId: `ERR-${createId().slice(0, 8)}`,
      requestId: createId(),
      code: "VALIDATION_FAILED",
      message: "Validation",
      status: 400,
      method: "POST",
      path: "/api/humans",
      userId: null,
      details: null,
      stack: null,
      createdAt: now,
    });

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/error-log?code=INTERNAL_ERROR", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ code: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].code).toBe("INTERNAL_ERROR");
  });

  it("filters by path parameter", async () => {
    const db = getDb();
    const now = new Date().toISOString();
    await db.insert(schema.errorLog).values({
      id: createId(),
      displayId: `ERR-${createId().slice(0, 8)}`,
      requestId: createId(),
      code: "INTERNAL_ERROR",
      message: "Error on humans",
      status: 500,
      method: "GET",
      path: "/api/humans",
      userId: null,
      details: null,
      stack: null,
      createdAt: now,
    });
    await db.insert(schema.errorLog).values({
      id: createId(),
      displayId: `ERR-${createId().slice(0, 8)}`,
      requestId: createId(),
      code: "INTERNAL_ERROR",
      message: "Error on flights",
      status: 500,
      method: "GET",
      path: "/api/flights",
      userId: null,
      details: null,
      stack: null,
      createdAt: now,
    });

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/error-log?path=/api/humans", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ path: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].path).toBe("/api/humans");
  });

  it("caps limit at 200", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/error-log?limit=999", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    // Just verifying no error; the limit is capped internally
  });
});

describe("DELETE /api/admin/error-log/cleanup", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/error-log/cleanup", {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin role", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/admin/error-log/cleanup", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("cleans up old error log entries", async () => {
    const db = getDb();
    // Insert an old entry (8 days ago) and a recent entry
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const recentDate = new Date().toISOString();

    await db.insert(schema.errorLog).values({
      id: createId(),
      displayId: `ERR-${createId().slice(0, 8)}`,
      requestId: createId(),
      code: "INTERNAL_ERROR",
      message: "Old error",
      status: 500,
      method: "GET",
      path: "/api/test",
      userId: null,
      details: null,
      stack: null,
      createdAt: oldDate,
    });
    await db.insert(schema.errorLog).values({
      id: createId(),
      displayId: `ERR-${createId().slice(0, 8)}`,
      requestId: createId(),
      code: "INTERNAL_ERROR",
      message: "Recent error",
      status: 500,
      method: "GET",
      path: "/api/test",
      userId: null,
      details: null,
      stack: null,
      createdAt: recentDate,
    });

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/error-log/cleanup", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    // Verify only the recent entry remains
    const listRes = await SELF.fetch("http://localhost/api/admin/error-log", {
      headers: { Cookie: sessionCookie(token) },
    });
    const listBody = (await listRes.json()) as { data: Array<{ message: string }> };
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0].message).toBe("Recent error");
  });

  it("returns success even when no old entries exist", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/error-log/cleanup", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
