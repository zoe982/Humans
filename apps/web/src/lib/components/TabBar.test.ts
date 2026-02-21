import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import TabBar from "./TabBar.svelte";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "details", label: "Details" },
  { id: "history", label: "History" },
];

describe("TabBar", () => {
  it("renders all tab labels", () => {
    render(TabBar, {
      props: { tabs, activeTab: "overview", onTabChange: vi.fn() },
    });
    expect(screen.getByText("Overview")).toBeDefined();
    expect(screen.getByText("Details")).toBeDefined();
    expect(screen.getByText("History")).toBeDefined();
  });

  it("renders tab buttons with role='tab'", () => {
    const { container } = render(TabBar, {
      props: { tabs, activeTab: "overview", onTabChange: vi.fn() },
    });
    const tabButtons = container.querySelectorAll('[role="tab"]');
    expect(tabButtons.length).toBe(3);
  });

  it("marks the active tab with aria-selected=true", () => {
    const { container } = render(TabBar, {
      props: { tabs, activeTab: "details", onTabChange: vi.fn() },
    });
    const detailsTab = container.querySelector("#tab-details");
    expect(detailsTab?.getAttribute("aria-selected")).toBe("true");
  });

  it("marks inactive tabs with aria-selected=false", () => {
    const { container } = render(TabBar, {
      props: { tabs, activeTab: "details", onTabChange: vi.fn() },
    });
    const overviewTab = container.querySelector("#tab-overview");
    const historyTab = container.querySelector("#tab-history");
    expect(overviewTab?.getAttribute("aria-selected")).toBe("false");
    expect(historyTab?.getAttribute("aria-selected")).toBe("false");
  });

  it("active tab has tabindex=0", () => {
    const { container } = render(TabBar, {
      props: { tabs, activeTab: "overview", onTabChange: vi.fn() },
    });
    const overviewTab = container.querySelector("#tab-overview");
    expect(overviewTab?.getAttribute("tabindex")).toBe("0");
  });

  it("inactive tabs have tabindex=-1", () => {
    const { container } = render(TabBar, {
      props: { tabs, activeTab: "overview", onTabChange: vi.fn() },
    });
    const detailsTab = container.querySelector("#tab-details");
    expect(detailsTab?.getAttribute("tabindex")).toBe("-1");
  });

  it("calls onTabChange with the correct id when a tab is clicked", async () => {
    const onTabChange = vi.fn();
    render(TabBar, {
      props: { tabs, activeTab: "overview", onTabChange },
    });
    await fireEvent.click(screen.getByText("Details"));
    expect(onTabChange).toHaveBeenCalledWith("details");
  });

  it("calls onTabChange when a different tab is clicked", async () => {
    const onTabChange = vi.fn();
    render(TabBar, {
      props: { tabs, activeTab: "overview", onTabChange },
    });
    await fireEvent.click(screen.getByText("History"));
    expect(onTabChange).toHaveBeenCalledWith("history");
  });

  it("wraps tabs in a div with role='tablist'", () => {
    const { container } = render(TabBar, {
      props: { tabs, activeTab: "overview", onTabChange: vi.fn() },
    });
    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();
  });

  it("each tab button has matching aria-controls panel id", () => {
    const { container } = render(TabBar, {
      props: { tabs, activeTab: "overview", onTabChange: vi.fn() },
    });
    const overviewTab = container.querySelector("#tab-overview");
    expect(overviewTab?.getAttribute("aria-controls")).toBe("panel-overview");
  });
});
