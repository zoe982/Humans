import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import Pagination from "./Pagination.svelte";

describe("Pagination", () => {
  it("renders nothing when total is 0", () => {
    const { container } = render(Pagination, {
      props: { page: 1, limit: 10, total: 0, baseUrl: "/humans" },
    });
    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders nav when total is greater than 0", () => {
    const { container } = render(Pagination, {
      props: { page: 1, limit: 10, total: 50, baseUrl: "/humans" },
    });
    expect(container.querySelector("nav")).not.toBeNull();
  });

  it("displays 'Showing 1–10 of 50' on the first page", () => {
    const { container } = render(Pagination, {
      props: { page: 1, limit: 10, total: 50, baseUrl: "/humans" },
    });
    const text = container.querySelector("p")?.textContent?.replace(/\s+/g, " ").trim();
    expect(text).toContain("1");
    expect(text).toContain("10");
    expect(text).toContain("50");
  });

  it("displays correct range on the second page", () => {
    const { container } = render(Pagination, {
      props: { page: 2, limit: 10, total: 50, baseUrl: "/humans" },
    });
    const text = container.querySelector("p")?.textContent?.replace(/\s+/g, " ").trim();
    expect(text).toContain("11");
    expect(text).toContain("20");
    expect(text).toContain("50");
  });

  it("clamps end to total on the last page", () => {
    const { container } = render(Pagination, {
      props: { page: 3, limit: 10, total: 25, baseUrl: "/humans" },
    });
    const text = container.querySelector("p")?.textContent?.replace(/\s+/g, " ").trim();
    expect(text).toContain("21");
    expect(text).toContain("25");
  });

  it("renders Prev as a disabled span on the first page", () => {
    const { container } = render(Pagination, {
      props: { page: 1, limit: 10, total: 50, baseUrl: "/humans" },
    });
    // On the first page there should be no anchor for Prev
    const links = container.querySelectorAll("a");
    const prevLink = Array.from(links).find((a) => a.textContent?.includes("Prev"));
    expect(prevLink).toBeUndefined();

    // The disabled Prev span should exist
    const spans = container.querySelectorAll("span");
    const prevSpan = Array.from(spans).find((s) => s.textContent?.includes("Prev"));
    expect(prevSpan).toBeDefined();
    expect(prevSpan?.className).toContain("opacity-40");
  });

  it("renders Next as a disabled span on the last page", () => {
    const { container } = render(Pagination, {
      props: { page: 5, limit: 10, total: 50, baseUrl: "/humans" },
    });
    const links = container.querySelectorAll("a");
    const nextLink = Array.from(links).find((a) => a.textContent?.includes("Next"));
    expect(nextLink).toBeUndefined();

    const spans = container.querySelectorAll("span");
    const nextSpan = Array.from(spans).find((s) => s.textContent?.includes("Next"));
    expect(nextSpan).toBeDefined();
    expect(nextSpan?.className).toContain("opacity-40");
  });

  it("renders Prev as an anchor link on pages after the first", () => {
    const { container } = render(Pagination, {
      props: { page: 3, limit: 10, total: 50, baseUrl: "/humans" },
    });
    const links = container.querySelectorAll("a");
    const prevLink = Array.from(links).find((a) => a.textContent?.includes("Prev"));
    expect(prevLink).toBeDefined();
    expect(prevLink?.getAttribute("href")).toContain("page=2");
  });

  it("renders Next as an anchor link when not on the last page", () => {
    const { container } = render(Pagination, {
      props: { page: 2, limit: 10, total: 50, baseUrl: "/humans" },
    });
    const links = container.querySelectorAll("a");
    const nextLink = Array.from(links).find((a) => a.textContent?.includes("Next"));
    expect(nextLink).toBeDefined();
    expect(nextLink?.getAttribute("href")).toContain("page=3");
  });

  it("includes limit in the generated page URL", () => {
    const { container } = render(Pagination, {
      props: { page: 1, limit: 25, total: 100, baseUrl: "/humans" },
    });
    const links = container.querySelectorAll("a");
    const nextLink = Array.from(links).find((a) => a.textContent?.includes("Next"));
    expect(nextLink?.getAttribute("href")).toContain("limit=25");
  });

  it("includes the baseUrl pathname in generated links", () => {
    const { container } = render(Pagination, {
      props: { page: 1, limit: 10, total: 30, baseUrl: "/clients" },
    });
    const links = container.querySelectorAll("a");
    const nextLink = Array.from(links).find((a) => a.textContent?.includes("Next"));
    expect(nextLink?.getAttribute("href")).toContain("/clients");
  });
});
