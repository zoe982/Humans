// @vitest-environment jsdom
// jsdom required: happy-dom strips table elements in <template> nodes and
// the slide transition uses DOM APIs not available in happy-dom.
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import RelatedListTable from "./RelatedListTable.svelte";

type TestItem = { id: string; name: string; date: string };

const items: TestItem[] = [
  { id: "1", name: "Alpha", date: "2025-01-01" },
  { id: "2", name: "Beta", date: "2025-06-15" },
  { id: "3", name: "Charlie", date: "2025-03-10" },
];

const columns = [
  { key: "name", label: "Name", sortable: true, sortValue: (i: TestItem) => i.name },
  { key: "date", label: "Date", sortable: true, sortValue: (i: TestItem) => i.date },
];

const searchFilter = (item: TestItem, q: string) =>
  item.name.toLowerCase().includes(q);

function makeRow() {
  return createRawSnippet(() => ({
    render: () => `<td>row</td>`,
    setup: () => {},
  }));
}

function makeAddForm() {
  return createRawSnippet(() => ({
    render: () => `<div>add form</div>`,
    setup: () => {},
  }));
}

function renderTable(overrides: Record<string, unknown> = {}) {
  return render(RelatedListTable, {
    props: {
      title: "Test List",
      items,
      columns,
      defaultSortKey: "date",
      defaultSortDirection: "desc" as const,
      searchFilter,
      addLabel: "Item",
      row: makeRow(),
      addForm: makeAddForm(),
      ...overrides,
    },
  });
}

describe("RelatedListTable", () => {
  it("renders the title", () => {
    renderTable();
    expect(screen.getByText("Test List")).toBeDefined();
  });

  it("shows search input when items exist and searchFilter is provided", () => {
    renderTable();
    expect(screen.getByPlaceholderText("Search...")).toBeDefined();
  });

  it("hides search input when searchFilter is not provided", () => {
    renderTable({ searchFilter: undefined });
    expect(screen.queryByPlaceholderText("Search...")).toBeNull();
  });

  it("renders sortable column headers as buttons with aria-sort", () => {
    const { container } = renderTable();
    const sortButtons = container.querySelectorAll("th button");
    expect(sortButtons.length).toBe(2);

    // The default sort key is "date" desc → date column should have aria-sort="descending"
    const dateHeader = container.querySelector('th[aria-sort="descending"]');
    expect(dateHeader).not.toBeNull();
  });

  it("toggles sort direction when clicking a sorted column header", async () => {
    const { container } = renderTable();
    const dateButton = screen.getByText("Date", { selector: "button" });
    await fireEvent.click(dateButton);
    // After clicking the already-sorted "date" column, it should toggle to ascending
    const dateHeader = container.querySelector('th[aria-sort="ascending"]');
    expect(dateHeader).not.toBeNull();
  });

  it("shows add button when addLabel and addForm are provided", () => {
    renderTable();
    expect(screen.getByText("+ Add Item")).toBeDefined();
  });

  it("shows empty message when items array is empty", () => {
    renderTable({ items: [], emptyMessage: "Nothing here." });
    expect(screen.getByText("Nothing here.")).toBeDefined();
  });
});
