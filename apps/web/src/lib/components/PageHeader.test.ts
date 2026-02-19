import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import PageHeader from "./PageHeader.svelte";

describe("PageHeader", () => {
  it("renders the title", () => {
    render(PageHeader, { props: { title: "Dashboard" } });
    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("renders as h1 element", () => {
    render(PageHeader, { props: { title: "Test Title" } });
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Test Title");
  });

  it("renders breadcrumbs when provided", () => {
    render(PageHeader, {
      props: {
        title: "Detail",
        breadcrumbs: [
          { label: "Home", href: "/" },
          { label: "Items", href: "/items" },
          { label: "Detail" },
        ],
      },
    });
    expect(screen.getByText("Home")).toBeDefined();
    expect(screen.getByText("Items")).toBeDefined();
  });

  it("renders breadcrumb links as anchor tags", () => {
    const { container } = render(PageHeader, {
      props: {
        title: "Page",
        breadcrumbs: [{ label: "Home", href: "/" }],
      },
    });
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/");
    expect(link?.textContent).toBe("Home");
  });

  it("renders non-link breadcrumbs as spans", () => {
    const { container } = render(PageHeader, {
      props: {
        title: "Page",
        breadcrumbs: [{ label: "Current" }],
      },
    });
    const spans = container.querySelectorAll("nav span");
    const breadcrumbSpan = Array.from(spans).find((s) => s.textContent === "Current");
    expect(breadcrumbSpan).toBeDefined();
  });
});
