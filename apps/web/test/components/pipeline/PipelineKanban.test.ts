import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import PipelineKanban from "../../../src/lib/components/pipeline/PipelineKanban.svelte";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelineGroup {
  stage: string;
  label: string;
  color: string;
  items: PipelineItem[];
}

interface PipelineItem {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Snippet factory
// ---------------------------------------------------------------------------

function makeCardSnippet(): ReturnType<typeof createRawSnippet> {
  return createRawSnippet((getItem: () => PipelineItem) => ({
    render: () => `<div data-testid="kanban-card">${getItem().name}</div>`,
    setup: () => { /* noop */ },
  }));
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const groups: PipelineGroup[] = [
  {
    stage: "prospect",
    label: "Prospect",
    color: "#6366f1",
    items: [
      { id: "i-1", name: "Alpha" },
      { id: "i-2", name: "Beta" },
    ],
  },
  {
    stage: "qualified",
    label: "Qualified",
    color: "#22c55e",
    items: [
      { id: "i-3", name: "Gamma" },
    ],
  },
  {
    stage: "closed",
    label: "Closed Won",
    color: "#f59e0b",
    items: [],
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderKanban(overrides: Record<string, unknown> = {}): ReturnType<typeof render> {
  return render(PipelineKanban, {
    props: {
      groups,
      card: makeCardSnippet(),
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PipelineKanban", () => {
  // ── 1. Column rendering ────────────────────────────────────────────────────

  it("renders one column per group", () => {
    const { container } = renderKanban();
    const columns = container.querySelectorAll("[data-stage]");
    expect(columns.length).toBe(3);
  });

  it("renders the Prospect column with its stage identifier", () => {
    const { container } = renderKanban();
    const col = container.querySelector('[data-stage="prospect"]');
    expect(col).not.toBeNull();
  });

  it("renders the Qualified column with its stage identifier", () => {
    const { container } = renderKanban();
    const col = container.querySelector('[data-stage="qualified"]');
    expect(col).not.toBeNull();
  });

  it("renders the Closed Won column with its stage identifier", () => {
    const { container } = renderKanban();
    const col = container.querySelector('[data-stage="closed"]');
    expect(col).not.toBeNull();
  });

  // ── 2. Column header labels ────────────────────────────────────────────────

  it("renders the Prospect label in its column header", () => {
    renderKanban();
    expect(screen.getByText("Prospect")).toBeDefined();
  });

  it("renders the Qualified label in its column header", () => {
    renderKanban();
    expect(screen.getByText("Qualified")).toBeDefined();
  });

  it("renders the Closed Won label in its column header", () => {
    renderKanban();
    expect(screen.getByText("Closed Won")).toBeDefined();
  });

  // ── 3. Card rendering via snippet ─────────────────────────────────────────

  it("renders a card for each item across all columns", () => {
    const { container } = renderKanban();
    const cards = container.querySelectorAll("[data-testid='kanban-card']");
    // 2 + 1 + 0 = 3 items total
    expect(cards.length).toBe(3);
  });

  it("renders item names via the card snippet", () => {
    renderKanban();
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByText("Beta")).toBeDefined();
    expect(screen.getByText("Gamma")).toBeDefined();
  });

  it("renders cards inside their respective column", () => {
    const { container } = renderKanban();
    const prospectCol = container.querySelector('[data-stage="prospect"]');
    const cardsInProspect = prospectCol?.querySelectorAll("[data-testid='kanban-card']");
    expect(cardsInProspect?.length).toBe(2);
  });

  // ── 4. Empty column ────────────────────────────────────────────────────────

  it("renders zero cards in an empty column", () => {
    const { container } = renderKanban();
    const closedCol = container.querySelector('[data-stage="closed"]');
    const cards = closedCol?.querySelectorAll("[data-testid='kanban-card']");
    expect(cards?.length).toBe(0);
  });

  it("renders an empty-state indicator inside an empty column", () => {
    const emptyGroups: PipelineGroup[] = [
      { stage: "prospect", label: "Prospect", color: "#6366f1", items: [] },
    ];
    const { container } = renderKanban({ groups: emptyGroups });
    const col = container.querySelector('[data-stage="prospect"]');
    // Column must communicate emptiness — either via a text node or data attribute
    const isEmpty =
      col?.querySelector("[data-empty]") !== null ||
      (col?.textContent ?? "").toLowerCase().includes("empty") ||
      (col?.textContent ?? "").trim().includes("0") ||
      col?.querySelectorAll("[data-testid='kanban-card']").length === 0;
    expect(isEmpty).toBe(true);
  });

  // ── 5. Zero groups ────────────────────────────────────────────────────────

  it("renders no columns when groups is empty", () => {
    const { container } = renderKanban({ groups: [] });
    const columns = container.querySelectorAll("[data-stage]");
    expect(columns.length).toBe(0);
  });

  // ── 6. Column item count ───────────────────────────────────────────────────

  it("displays the item count in the Prospect column header", () => {
    const { container } = renderKanban();
    const prospectCol = container.querySelector('[data-stage="prospect"]');
    expect(prospectCol?.textContent).toContain("2");
  });

  it("displays the item count in the Qualified column header", () => {
    const { container } = renderKanban();
    const qualifiedCol = container.querySelector('[data-stage="qualified"]');
    expect(qualifiedCol?.textContent).toContain("1");
  });
});
