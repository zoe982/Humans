import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { axe } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/matchers";
import RecordManagementBar from "./RecordManagementBar.svelte";

expect.extend({ toHaveNoViolations });

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
    const trigger = container.querySelector('[data-select-trigger]');
    expect(trigger).not.toBeNull();
    expect(screen.getByText("Update")).toBeDefined();
  });

  it("does not render status dropdown when no statusOptions", () => {
    const { container } = render(RecordManagementBar, {
      props: { ...baseProps, status: "active" },
    });
    const trigger = container.querySelector('[data-select-trigger]');
    expect(trigger).toBeNull();
  });

  it("does not contain any native select elements", () => {
    const { container } = render(RecordManagementBar, {
      props: {
        ...baseProps,
        status: "active",
        statusOptions: ["active", "inactive", "archived"],
        statusFormAction: "?/updateStatus",
      },
    });
    expect(container.querySelectorAll("select").length).toBe(0);
  });

  it("hidden input has name=status for form submission", () => {
    const { container } = render(RecordManagementBar, {
      props: {
        ...baseProps,
        status: "active",
        statusOptions: ["active", "inactive", "archived"],
        statusFormAction: "?/updateStatus",
      },
    });
    const hiddenInput = container.querySelector('input[type="hidden"][name="status"]');
    expect(hiddenInput).not.toBeNull();
  });

  // ── Accessibility (axe-core) ────────────────────────────────────

  it("has no axe violations with status dropdown", async () => {
    const { container } = render(RecordManagementBar, {
      props: {
        ...baseProps,
        status: "active",
        statusOptions: ["active", "inactive", "archived"],
        statusFormAction: "?/updateStatus",
      },
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
