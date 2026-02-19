import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import RecordManagementBar from "./RecordManagementBar.svelte";

describe("RecordManagementBar", () => {
  const baseProps = {
    backHref: "/humans",
    backLabel: "Humans",
    title: "John Doe",
  };

  it("renders the title", () => {
    render(RecordManagementBar, { props: baseProps });
    expect(screen.getByText("John Doe")).toBeDefined();
  });

  it("renders back link with correct href and label", () => {
    const { container } = render(RecordManagementBar, { props: baseProps });
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/humans");
    expect(link?.textContent).toContain("Humans");
  });

  it("renders StatusBadge when status is provided", () => {
    render(RecordManagementBar, {
      props: { ...baseProps, status: "active" },
    });
    expect(screen.getByText("active")).toBeDefined();
  });

  it("does not render status when not provided", () => {
    render(RecordManagementBar, { props: baseProps });
    expect(screen.queryByText("active")).toBeNull();
  });

  it("renders status dropdown with form action", () => {
    const { container } = render(RecordManagementBar, {
      props: {
        ...baseProps,
        status: "active",
        statusOptions: ["active", "inactive", "archived"],
        statusFormAction: "?/updateStatus",
      },
    });
    const select = container.querySelector("select");
    expect(select).not.toBeNull();
    const options = container.querySelectorAll("option");
    expect(options.length).toBe(3);
    expect(screen.getByText("Update")).toBeDefined();
  });

  it("does not render status dropdown when no statusOptions", () => {
    const { container } = render(RecordManagementBar, {
      props: { ...baseProps, status: "active" },
    });
    const select = container.querySelector("select");
    expect(select).toBeNull();
  });
});
