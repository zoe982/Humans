// @vitest-environment jsdom
// jsdom required: PipelineTable renders <table>/<thead>/<tbody>/<tr>/<th>/<td>
// elements. happy-dom strips table elements inside <template> nodes — a known
// limitation that breaks Svelte 5's $.from_html() template cache. jsdom parses
// table elements in template context correctly.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import PipelineTable from "../../../src/lib/components/pipeline/PipelineTable.svelte";

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
// Snippet factories
// ---------------------------------------------------------------------------

function makeHeaderSnippet(): ReturnType<typeof createRawSnippet> {
  return createRawSnippet(() => ({
    render: () => `<th data-testid="col-header">Name</th>`,
    setup: () => { /* noop */ },
  }));
}

function makeRowSnippet(): ReturnType<typeof createRawSnippet> {
  return createRawSnippet((getItem: () => PipelineItem) => ({
    render: () => `<td data-testid="row-cell">${getItem().name}</td>`,
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

function renderTable(overrides: Record<string, unknown> = {}): ReturnType<typeof render> {
  return render(PipelineTable, {
    props: {
      groups,
      header: makeHeaderSnippet(),
      row: makeRowSnippet(),
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PipelineTable", () => {
  // ── 1. Group headers and labels ────────────────────────────────────────────

  it("renders a group header row for each stage", () => {
    const { container } = renderTable();
    // Each group contributes one header row — find by data attribute or by
    // searching text content that matches the group labels
    const headerRows = container.querySelectorAll("[data-stage]");
    expect(headerRows.length).toBe(3);
  });

  it("renders the group label text for the Prospect stage", () => {
    renderTable();
    expect(screen.getByText("Prospect")).toBeDefined();
  });

  it("renders the group label text for the Qualified stage", () => {
    renderTable();
    expect(screen.getByText("Qualified")).toBeDefined();
  });

  it("renders the group label text for the Closed Won stage", () => {
    renderTable();
    expect(screen.getByText("Closed Won")).toBeDefined();
  });

  // ── 2. Count badges ────────────────────────────────────────────────────────

  it("renders a count badge showing the number of items in the Prospect group", () => {
    const { container } = renderTable();
    // The badge for the prospect group shows "2"
    const prospectHeader = container.querySelector('[data-stage="prospect"]');
    expect(prospectHeader?.textContent).toContain("2");
  });

  it("renders a count badge showing the number of items in the Qualified group", () => {
    const { container } = renderTable();
    const qualifiedHeader = container.querySelector('[data-stage="qualified"]');
    expect(qualifiedHeader?.textContent).toContain("1");
  });

  it("renders a count badge of 0 for an empty group", () => {
    const { container } = renderTable();
    const closedHeader = container.querySelector('[data-stage="closed"]');
    expect(closedHeader?.textContent).toContain("0");
  });

  // ── 3. Row rendering via snippet ───────────────────────────────────────────

  it("renders a row for each item across all groups", () => {
    const { container } = renderTable();
    const cells = container.querySelectorAll("[data-testid='row-cell']");
    // 2 + 1 + 0 = 3 items total
    expect(cells.length).toBe(3);
  });

  it("renders item names via the row snippet", () => {
    renderTable();
    expect(screen.getByText("Alpha")).toBeDefined();
    expect(screen.getByText("Beta")).toBeDefined();
    expect(screen.getByText("Gamma")).toBeDefined();
  });

  it("renders the header snippet in the table head", () => {
    const { container } = renderTable();
    const colHeader = container.querySelector("[data-testid='col-header']");
    expect(colHeader).not.toBeNull();
    expect(colHeader?.textContent).toBe("Name");
  });

  // ── 4. Empty group ─────────────────────────────────────────────────────────

  it("renders no data rows for an empty group", () => {
    const emptyGroups: PipelineGroup[] = [
      { stage: "closed", label: "Closed Won", color: "#000", items: [] },
    ];
    const { container } = renderTable({ groups: emptyGroups });
    const cells = container.querySelectorAll("[data-testid='row-cell']");
    expect(cells.length).toBe(0);
  });

  // ── 5. All groups empty ────────────────────────────────────────────────────

  it("renders group headers even when all groups are empty", () => {
    const emptyGroups: PipelineGroup[] = [
      { stage: "prospect", label: "Prospect", color: "#6366f1", items: [] },
      { stage: "qualified", label: "Qualified", color: "#22c55e", items: [] },
    ];
    renderTable({ groups: emptyGroups });
    expect(screen.getByText("Prospect")).toBeDefined();
    expect(screen.getByText("Qualified")).toBeDefined();
  });

  // ── 6. Zero groups ────────────────────────────────────────────────────────

  it("renders no group headers when groups is empty", () => {
    const { container } = renderTable({ groups: [] });
    const headerRows = container.querySelectorAll("[data-stage]");
    expect(headerRows.length).toBe(0);
  });
});
