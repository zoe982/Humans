import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import PipelineToggle from "../../../src/lib/components/pipeline/PipelineToggle.svelte";

// PipelineToggle renders two buttons — one for "table" view and one for
// "kanban" view. The active button carries a highlighted visual state.
// viewMode is a bindable prop; the component calls an onchange callback
// (or updates the binding) when the user switches views.

describe("PipelineToggle", () => {
  // ── 1. Rendering ───────────────────────────────────────────────────────────

  it("renders a table view button", () => {
    render(PipelineToggle, { props: { viewMode: "table" } });
    const tableBtn = screen.getByRole("button", { name: /table/i });
    expect(tableBtn).toBeDefined();
  });

  it("renders a kanban view button", () => {
    render(PipelineToggle, { props: { viewMode: "table" } });
    const kanbanBtn = screen.getByRole("button", { name: /kanban/i });
    expect(kanbanBtn).toBeDefined();
  });

  it("renders exactly two buttons", () => {
    const { container } = render(PipelineToggle, { props: { viewMode: "table" } });
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBe(2);
  });

  // ── 2. Active state ────────────────────────────────────────────────────────

  it("marks the table button as active when viewMode is 'table'", () => {
    const { container } = render(PipelineToggle, { props: { viewMode: "table" } });
    const tableBtn = screen.getByRole("button", { name: /table/i });
    // Active button should carry aria-pressed=true or a data-active attribute
    const isActive =
      tableBtn.getAttribute("aria-pressed") === "true" ||
      tableBtn.hasAttribute("data-active") ||
      tableBtn.classList.contains("active") ||
      container.querySelector('[data-viewmode="table"][aria-pressed="true"]') !== null;
    expect(isActive).toBe(true);
  });

  it("marks the kanban button as active when viewMode is 'kanban'", () => {
    const { container } = render(PipelineToggle, { props: { viewMode: "kanban" } });
    const kanbanBtn = screen.getByRole("button", { name: /kanban/i });
    const isActive =
      kanbanBtn.getAttribute("aria-pressed") === "true" ||
      kanbanBtn.hasAttribute("data-active") ||
      kanbanBtn.classList.contains("active") ||
      container.querySelector('[data-viewmode="kanban"][aria-pressed="true"]') !== null;
    expect(isActive).toBe(true);
  });

  it("does not mark the kanban button as active when viewMode is 'table'", () => {
    render(PipelineToggle, { props: { viewMode: "table" } });
    const kanbanBtn = screen.getByRole("button", { name: /kanban/i });
    const isActive =
      kanbanBtn.getAttribute("aria-pressed") === "true" ||
      (kanbanBtn.hasAttribute("data-active") && kanbanBtn.getAttribute("data-active") !== "false");
    expect(isActive).toBe(false);
  });

  // ── 3. Interaction — clicking switches view ────────────────────────────────

  it("calls onchange with 'kanban' when the kanban button is clicked", async () => {
    const onchange = vi.fn();
    render(PipelineToggle, { props: { viewMode: "table", onchange } });
    const kanbanBtn = screen.getByRole("button", { name: /kanban/i });
    await fireEvent.click(kanbanBtn);
    expect(onchange).toHaveBeenCalledWith("kanban");
  });

  it("calls onchange with 'table' when the table button is clicked from kanban mode", async () => {
    const onchange = vi.fn();
    render(PipelineToggle, { props: { viewMode: "kanban", onchange } });
    const tableBtn = screen.getByRole("button", { name: /table/i });
    await fireEvent.click(tableBtn);
    expect(onchange).toHaveBeenCalledWith("table");
  });

  it("does not call onchange when the already-active button is clicked", async () => {
    const onchange = vi.fn();
    render(PipelineToggle, { props: { viewMode: "table", onchange } });
    const tableBtn = screen.getByRole("button", { name: /table/i });
    await fireEvent.click(tableBtn);
    expect(onchange).not.toHaveBeenCalled();
  });

  // ── 4. Accessibility ───────────────────────────────────────────────────────

  it("wraps buttons in a group with a descriptive label", () => {
    const { container } = render(PipelineToggle, { props: { viewMode: "table" } });
    // Should use role="group" or a toolbar wrapping the toggle buttons
    const group =
      container.querySelector('[role="group"]') ??
      container.querySelector('[role="toolbar"]');
    expect(group).not.toBeNull();
  });
});
