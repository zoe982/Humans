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
});
