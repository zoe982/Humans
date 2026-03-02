import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("app.html", () => {
  const html = readFileSync(resolve(__dirname, "../../src/app.html"), "utf-8");

  it("does not contain diagnostic trap script (MutationObserver)", () => {
    expect(html).not.toContain("MutationObserver");
  });

  it("does not monkey-patch window.fetch", () => {
    expect(html).not.toContain("var origFetch = window.fetch");
  });

  it("does not monkey-patch history.pushState", () => {
    expect(html).not.toContain("var origPushState = history.pushState");
  });
});
