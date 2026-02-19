/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF, env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie } from "../helpers";

describe("POST /api/documents/upload", () => {
  it("returns 401 when unauthenticated", async () => {
    const form = new FormData();
    form.append("file", new Blob(["test"], { type: "text/plain" }), "test.txt");
    const res = await SELF.fetch("http://localhost/api/documents/upload", {
      method: "POST",
      body: form,
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file field is provided", async () => {
    const { token } = await createUserAndSession("agent");
    const form = new FormData();
    const res = await SELF.fetch("http://localhost/api/documents/upload", {
      method: "POST",
      headers: { Cookie: sessionCookie(token) },
      body: form,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("No file");
  });

  it("returns 400 for files exceeding 10MB", async () => {
    const { token } = await createUserAndSession("agent");
    const bigContent = new Uint8Array(11 * 1024 * 1024); // 11 MB
    const form = new FormData();
    form.append("file", new Blob([bigContent], { type: "application/pdf" }), "big.pdf");
    const res = await SELF.fetch("http://localhost/api/documents/upload", {
      method: "POST",
      headers: { Cookie: sessionCookie(token) },
      body: form,
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("too large");
  });

  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const form = new FormData();
    form.append("file", new Blob(["content"], { type: "text/plain" }), "file.txt");
    const res = await SELF.fetch("http://localhost/api/documents/upload", {
      method: "POST",
      headers: { Cookie: sessionCookie(token) },
      body: form,
    });
    expect(res.status).toBe(403);
  });

  it("uploads file and returns an R2 key", async () => {
    const { token } = await createUserAndSession("agent");
    const form = new FormData();
    form.append("file", new Blob(["health cert"], { type: "application/pdf" }), "health.pdf");
    const res = await SELF.fetch("http://localhost/api/documents/upload", {
      method: "POST",
      headers: { Cookie: sessionCookie(token) },
      body: form,
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { key: string } };
    expect(typeof body.data.key).toBe("string");
    expect(body.data.key).toContain("health.pdf");
  });
});

describe("GET /api/documents/:key", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/documents/some-key");
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent document key", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/documents/does-not-exist-key", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });

  it("returns document for an existing key pre-seeded in R2", async () => {
    // Seed R2 directly so there's no cross-request storage isolation issue
    const testKey = "test-doc-key-preseeded.pdf";
    await env.DOCUMENTS.put(testKey, new TextEncoder().encode("certificate content"), {
      httpMetadata: { contentType: "application/pdf" },
    });

    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`http://localhost/api/documents/${testKey}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    // Must consume the body to release the R2 stream before cleanup runs
    await res.arrayBuffer();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    expect(res.headers.get("cache-control")).toContain("private");
  });
});
