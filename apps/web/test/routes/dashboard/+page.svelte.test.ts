import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import DashboardPage from "../../../src/routes/dashboard/+page.svelte";

/**
 * Mock data shape matching the return type of the dashboard load function.
 * Pass empty arrays for recentActivities and dailyCounts to avoid rendering
 * the snippet-based RelatedListTable body and the ActivityChart, keeping
 * these tests focused on the stat card link correctness.
 */
function makeMockData(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: "user-1", email: "test@example.com", role: "agent", name: "Test User" },
    counts: { humans: 10, pets: 5, activities: 42, geoInterests: 7 },
    recentActivities: [],
    dailyCounts: [],
    ...overrides,
  };
}

describe("Dashboard +page.svelte — stat card links", () => {
  it("Humans stat card links to /humans", () => {
    const { container } = render(DashboardPage, { props: { data: makeMockData() } });
    const links = Array.from(container.querySelectorAll("a[href]"));
    const humansCards = links.filter(
      (a) => a.getAttribute("href") === "/humans" && a.querySelector("h3")?.textContent === "Humans",
    );
    expect(humansCards.length).toBe(1);
  });

  it("Pets stat card links to /pets (not /humans)", () => {
    const { container } = render(DashboardPage, { props: { data: makeMockData() } });
    const links = Array.from(container.querySelectorAll("a[href]"));
    const petsCard = links.find(
      (a) => a.querySelector("h3")?.textContent === "Pets",
    );
    expect(petsCard).toBeDefined();
    expect(petsCard?.getAttribute("href")).toBe("/pets");
  });

  it("Activities stat card links to /activities", () => {
    const { container } = render(DashboardPage, { props: { data: makeMockData() } });
    const links = Array.from(container.querySelectorAll("a[href]"));
    const activitiesCard = links.find(
      (a) => a.querySelector("h3")?.textContent === "Total Activities",
    );
    expect(activitiesCard).toBeDefined();
    expect(activitiesCard?.getAttribute("href")).toBe("/activities");
  });

  it("Geo-Interests stat card links to /geo-interests", () => {
    const { container } = render(DashboardPage, { props: { data: makeMockData() } });
    const links = Array.from(container.querySelectorAll("a[href]"));
    const geoCard = links.find(
      (a) => a.querySelector("h3")?.textContent === "Geo-Interests",
    );
    expect(geoCard).toBeDefined();
    expect(geoCard?.getAttribute("href")).toBe("/geo-interests");
  });

  it("renders the correct count in the Pets stat card", () => {
    const { container } = render(DashboardPage, { props: { data: makeMockData() } });
    const links = Array.from(container.querySelectorAll("a[href]"));
    const petsCard = links.find(
      (a) => a.querySelector("h3")?.textContent === "Pets",
    );
    expect(petsCard?.querySelector("p")?.textContent).toBe("5");
  });

  it("renders the user name in the welcome message", () => {
    const { container } = render(DashboardPage, { props: { data: makeMockData() } });
    expect(container.textContent).toContain("Test User");
  });

  it("stat card icons use text-text-secondary (not text-text-muted) — source audit", () => {
    const src = readFileSync(
      resolve(__dirname, "../../../src/routes/dashboard/+page.svelte"),
      "utf-8",
    );
    // Match icon components (Users, PawPrint, Activity, Globe2) with class prop
    const iconClassPattern = /<(?:Users|PawPrint|Activity|Globe2)\b[^>]*class="([^"]*)"/g;
    const matches = [...src.matchAll(iconClassPattern)];
    expect(matches.length).toBe(4);
    for (const match of matches) {
      expect(match[1]).toContain("text-text-secondary");
      expect(match[1]).not.toContain("text-text-muted");
    }
  });

  it("stat card hover rings use transition-all (not bare transition) — source audit", () => {
    const src = readFileSync(
      resolve(__dirname, "../../../src/routes/dashboard/+page.svelte"),
      "utf-8",
    );
    // Find all class attributes containing hover:ring-
    const hoverRingPattern = /class="[^"]*hover:ring-[^"]*"/g;
    const matches = [...src.matchAll(hoverRingPattern)];
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      // Must have transition-all, not bare transition
      expect(match[0]).toContain("transition-all");
      // Must not contain bare "transition" without a suffix (e.g. transition-all is OK, plain transition is not)
      expect(match[0]).not.toMatch(/\btransition\b(?!-)/);
    }
  });
  it("search input uses standard glass-input sizing (py-2 text-sm, not py-3 text-base) — source audit", () => {
    const src = readFileSync(
      resolve(__dirname, "../../../src/routes/dashboard/+page.svelte"),
      "utf-8",
    );
    // Find the search input class attribute (glass-input on the search bar)
    const inputClassMatch = src.match(/class="(glass-input[^"]*)"/);
    expect(inputClassMatch).not.toBeNull();
    const inputClass = inputClassMatch![1];
    expect(inputClass).not.toContain("py-3");
    expect(inputClass).not.toContain("text-base");
    expect(inputClass).toContain("py-2");
    expect(inputClass).toContain("text-sm");
  });
  it("all section headings use consistent mb-4 bottom margin — source audit", () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const src = readFileSync(resolve(__dirname, "../../../src/routes/dashboard/+page.svelte"), "utf-8");
    const h2Tags = src.match(/<h2[^>]*>/g) ?? [];
    expect(h2Tags.length).toBeGreaterThanOrEqual(2);
    for (const tag of h2Tags) {
      expect(tag).toContain("mb-4");
    }
  });
});

describe("Dashboard +page.svelte — BUG-010 view all activities link placement", () => {
  it("'View all activities' link is inside a .glass-card container — DOM test", () => {
    // Use empty recentActivities to avoid happy-dom snippet rendering crash.
    // The footer snippet renders unconditionally (outside the items conditional),
    // so the link is still present and inside the glass-card even with no items.
    const { container } = render(DashboardPage, { props: { data: makeMockData() } });
    const viewAllLink = Array.from(container.querySelectorAll("a")).find(
      (a) => a.textContent?.trim() === "View all activities",
    );
    expect(viewAllLink).toBeDefined();
    const glassCard = viewAllLink?.closest(".glass-card");
    expect(glassCard).not.toBeNull();
  });

  it("no orphaned 'View all activities' div outside RelatedListTable — source audit", () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const src = readFileSync(
      resolve(__dirname, "../../../src/routes/dashboard/+page.svelte"),
      "utf-8",
    );
    // The old pattern was a free-floating mt-3 text-right div after </RelatedListTable>
    expect(src).not.toMatch(/mt-3 text-right/);
    // The footer snippet must be present inside RelatedListTable
    expect(src).toContain("{#snippet footer()}");
  });
});
