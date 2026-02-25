// @vitest-environment jsdom
// EntityListPage renders a <table> with <thead>/<tbody>/<tr>/<th>/<td>
// elements. happy-dom strips table elements when parsed inside <template>
// nodes (a known limitation), which breaks Svelte 5's $.from_html() template
// cache. jsdom parses table elements in template context correctly.
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import EntityListPage from "./EntityListPage.svelte";

// lucide-svelte icons are replaced globally via vitest.config.ts aliases.
// All icon imports resolve to test/mocks/lucide-svelte.ts which renders safe
// <span> stubs instead of SVG elements (happy-dom and jsdom both cannot handle
// SVGElement.setAttribute calls from lucide-svelte's raw SVG construction).

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

interface TestItem { id: string; name: string; createdAt: string }

const items: TestItem[] = [
  { id: "item-1", name: "Alpha", createdAt: "2024-01-01" },
  { id: "item-2", name: "Beta", createdAt: "2024-02-01" },
  { id: "item-3", name: "Gamma", createdAt: "2024-03-01" },
];

const columns = [
  { key: "name", label: "Name", sortable: true, sortValue: (item: TestItem) => item.name },
  { key: "createdAt", label: "Created At", sortable: false },
];

const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Items", href: "/items" }];

// ---------------------------------------------------------------------------
// Snippet factories
// ---------------------------------------------------------------------------

function makeDesktopRow(): ReturnType<typeof createRawSnippet> {
  return createRawSnippet((getItem: () => TestItem) => ({
    render: () => `<td data-testid="desktop-cell">${getItem().name}</td>`,
    setup: () => { /* noop */ },
  }));
}

function makeMobileCard(): ReturnType<typeof createRawSnippet> {
  return createRawSnippet((getItem: () => TestItem) => ({
    render: () => `<div data-testid="mobile-card">${getItem().name}</div>`,
    setup: () => { /* noop */ },
  }));
}

// ---------------------------------------------------------------------------
// Base props shared across tests
// ---------------------------------------------------------------------------

function baseProps(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: "Items",
    breadcrumbs,
    items,
    columns,
    desktopRow: makeDesktopRow(),
    mobileCard: makeMobileCard(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EntityListPage", () => {
  // ── 1. Renders table with items ────────────────────────────────────────────

  it("renders column headers in the desktop table", () => {
    render(EntityListPage, { props: baseProps() });
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Created At")).toBeDefined();
  });

  it("renders a desktop row for each item", () => {
    const { container } = render(EntityListPage, { props: baseProps() });
    const cells = container.querySelectorAll("[data-testid='desktop-cell']");
    expect(cells.length).toBe(3);
  });

  it("renders item names via the desktopRow snippet", () => {
    render(EntityListPage, { props: baseProps() });
    // All three item names appear in the desktop table cells
    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beta").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gamma").length).toBeGreaterThan(0);
  });

  it("renders the page title heading", () => {
    render(EntityListPage, { props: baseProps() });
    // Use getByRole to target the h1 specifically — "Items" also appears in the
    // breadcrumb link, so getByText would match multiple elements.
    expect(screen.getByRole("heading", { name: "Items" })).toBeDefined();
  });

  // ── 2. Client-side search filters items ───────────────────────────────────

  it("renders a search input when searchFilter is provided", () => {
    const { container } = render(EntityListPage, {
      props: baseProps({
        searchFilter: (item: TestItem, q: string) => item.name.toLowerCase().includes(q),
      }),
    });
    const input = container.querySelector("input[type='text']");
    expect(input).not.toBeNull();
  });

  it("filters desktop rows when search query matches one item", async () => {
    const { container } = render(EntityListPage, {
      props: baseProps({
        searchFilter: (item: TestItem, q: string) => item.name.toLowerCase().includes(q),
      }),
    });
    const input = container.querySelector("input[type='text']");
    if (!(input instanceof HTMLInputElement)) throw new Error("expected text input");
    await fireEvent.input(input, { target: { value: "alpha" } });
    const cells = container.querySelectorAll("[data-testid='desktop-cell']");
    expect(cells.length).toBe(1);
    expect(cells[0]?.textContent).toBe("Alpha");
  });

  it("filters mobile cards when search query matches one item", async () => {
    const { container } = render(EntityListPage, {
      props: baseProps({
        searchFilter: (item: TestItem, q: string) => item.name.toLowerCase().includes(q),
      }),
    });
    const input = container.querySelector("input[type='text']");
    if (!(input instanceof HTMLInputElement)) throw new Error("expected text input");
    await fireEvent.input(input, { target: { value: "beta" } });
    const cards = container.querySelectorAll("[data-testid='mobile-card']");
    expect(cards.length).toBe(1);
    expect(cards[0]?.textContent).toBe("Beta");
  });

  it("shows all items when search query is cleared", async () => {
    const { container } = render(EntityListPage, {
      props: baseProps({
        searchFilter: (item: TestItem, q: string) => item.name.toLowerCase().includes(q),
      }),
    });
    const input = container.querySelector("input[type='text']");
    if (!(input instanceof HTMLInputElement)) throw new Error("expected text input");
    await fireEvent.input(input, { target: { value: "alpha" } });
    await fireEvent.input(input, { target: { value: "" } });
    const cells = container.querySelectorAll("[data-testid='desktop-cell']");
    expect(cells.length).toBe(3);
  });

  it("does not render a search input when searchFilter is not provided", () => {
    const { container } = render(EntityListPage, { props: baseProps() });
    expect(container.querySelector("input[type='text']")).toBeNull();
  });

  it("uses the custom searchPlaceholder when provided", () => {
    const { container } = render(EntityListPage, {
      props: baseProps({
        searchFilter: (item: TestItem, q: string) => item.name.toLowerCase().includes(q),
        searchPlaceholder: "Find an item...",
      }),
    });
    const input = container.querySelector("input[type='text']");
    if (!(input instanceof HTMLInputElement)) throw new Error("expected text input");
    expect(input.getAttribute("placeholder")).toBe("Find an item...");
  });

  // ── 3. Column sorting toggles direction ───────────────────────────────────

  it("sets aria-sort to 'none' on a sortable column that is not the active sort key", () => {
    const { container } = render(EntityListPage, { props: baseProps() });
    const nameHeader = Array.from(container.querySelectorAll("th")).find(
      (th) => th.textContent.includes("Name"),
    );
    expect(nameHeader?.getAttribute("aria-sort")).toBe("none");
  });

  it("sets aria-sort to 'ascending' after clicking a sortable column header", async () => {
    const { container } = render(EntityListPage, {
      props: baseProps({ defaultSortKey: "" }),
    });
    const sortButton = screen.getByRole("button", { name: /Name/ });
    await fireEvent.click(sortButton);
    const nameHeader = Array.from(container.querySelectorAll("th")).find(
      (th) => th.textContent.includes("Name"),
    );
    expect(nameHeader?.getAttribute("aria-sort")).toBe("ascending");
  });

  it("toggles aria-sort from 'ascending' to 'descending' on second click", async () => {
    const { container } = render(EntityListPage, {
      props: baseProps({ defaultSortKey: "" }),
    });
    const sortButton = screen.getByRole("button", { name: /Name/ });
    await fireEvent.click(sortButton);
    await fireEvent.click(sortButton);
    const nameHeader = Array.from(container.querySelectorAll("th")).find(
      (th) => th.textContent.includes("Name"),
    );
    expect(nameHeader?.getAttribute("aria-sort")).toBe("descending");
  });

  it("resets direction to 'ascending' when switching to a different sort column", async () => {
    const columnsWithTwo = [
      { key: "name", label: "Name", sortable: true, sortValue: (item: TestItem) => item.name },
      { key: "createdAt", label: "Created At", sortable: true, sortValue: (item: TestItem) => item.createdAt },
    ];
    const { container } = render(EntityListPage, {
      props: baseProps({ columns: columnsWithTwo, defaultSortKey: "name", defaultSortDirection: "desc" }),
    });
    // Click the second column (Created At)
    const createdAtButton = screen.getByRole("button", { name: /Created At/ });
    await fireEvent.click(createdAtButton);
    const createdAtHeader = Array.from(container.querySelectorAll("th")).find(
      (th) => th.textContent.includes("Created At"),
    );
    expect(createdAtHeader?.getAttribute("aria-sort")).toBe("ascending");
  });

  it("does not set aria-sort attribute on non-sortable columns", () => {
    const { container } = render(EntityListPage, { props: baseProps() });
    const createdAtHeader = Array.from(container.querySelectorAll("th")).find(
      (th) => th.textContent.includes("Created At"),
    );
    expect(createdAtHeader?.hasAttribute("aria-sort")).toBe(false);
  });

  it("renders the default sort direction arrow when defaultSortKey is set", () => {
    const { container } = render(EntityListPage, {
      props: baseProps({ defaultSortKey: "name", defaultSortDirection: "asc" }),
    });
    // The ascending arrow ▲ should be present in the Name header
    const nameHeader = Array.from(container.querySelectorAll("th")).find(
      (th) => th.textContent.includes("Name"),
    );
    expect(nameHeader?.textContent).toContain("▲");
  });

  // ── 4. Delete flow ─────────────────────────────────────────────────────────

  it("renders Delete buttons for each row when canDelete is true", () => {
    render(EntityListPage, { props: baseProps({ canDelete: true }) });
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    expect(deleteButtons.length).toBe(3);
  });

  it("does not render Delete buttons when canDelete is false", () => {
    render(EntityListPage, { props: baseProps({ canDelete: false }) });
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("renders the Actions column header when canDelete is true", () => {
    render(EntityListPage, { props: baseProps({ canDelete: true }) });
    expect(screen.getByText("Actions")).toBeDefined();
  });

  it("opens the ConfirmDialog when a Delete button is clicked", async () => {
    render(EntityListPage, { props: baseProps({ canDelete: true, deleteMessage: "Confirm deletion?" }) });
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await fireEvent.click(deleteButtons[0]);
    expect(screen.getByText("Confirm deletion?")).toBeDefined();
  });

  it("does not render ConfirmDialog content before Delete is clicked", () => {
    render(EntityListPage, { props: baseProps({ canDelete: true, deleteMessage: "Confirm deletion?" }) });
    // Dialog should not be open yet — message should not be visible
    expect(screen.queryByText("Confirm deletion?")).toBeNull();
  });

  it("closes the ConfirmDialog when Cancel is clicked", async () => {
    render(EntityListPage, { props: baseProps({ canDelete: true, deleteMessage: "Confirm deletion?" }) });
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await fireEvent.click(deleteButtons[0]);
    // Dialog is open — click Cancel
    const cancelButton = screen.getByText("Cancel");
    await fireEvent.click(cancelButton);
    expect(screen.queryByText("Confirm deletion?")).toBeNull();
  });

  it("renders a hidden form with deleteAction when canDelete is true", () => {
    const { container } = render(EntityListPage, {
      props: baseProps({ canDelete: true, deleteAction: "?/remove" }),
    });
    const form = container.querySelector("form.hidden");
    expect(form).not.toBeNull();
    expect(form?.getAttribute("action")).toBe("?/remove");
  });

  // ── 5. Mobile card view renders ───────────────────────────────────────────

  it("renders a mobile card for each item", () => {
    const { container } = render(EntityListPage, { props: baseProps() });
    const cards = container.querySelectorAll("[data-testid='mobile-card']");
    expect(cards.length).toBe(3);
  });

  it("renders item names in mobile cards via the mobileCard snippet", () => {
    const { container } = render(EntityListPage, { props: baseProps() });
    const cards = container.querySelectorAll("[data-testid='mobile-card']");
    const names = Array.from(cards).map((c) => c.textContent);
    expect(names).toContain("Alpha");
    expect(names).toContain("Beta");
    expect(names).toContain("Gamma");
  });

  it("renders the mobile card container with sm:hidden class", () => {
    const { container } = render(EntityListPage, { props: baseProps() });
    // The mobile container is the first sibling div with sm:hidden
    const mobileContainer = container.querySelector(".sm\\:hidden");
    expect(mobileContainer).not.toBeNull();
  });

  // ── 6. Empty state when no items ──────────────────────────────────────────

  it("shows the default emptyMessage in the desktop table when items is empty", () => {
    const { container } = render(EntityListPage, {
      props: baseProps({ items: [] }),
    });
    const tdEmpty = container.querySelector("td.text-center");
    expect(tdEmpty?.textContent).toContain("No items found.");
  });

  it("shows a custom emptyMessage in the desktop table when provided", () => {
    const { container } = render(EntityListPage, {
      props: baseProps({ items: [], emptyMessage: "Nothing here yet." }),
    });
    const tdEmpty = container.querySelector("td.text-center");
    expect(tdEmpty?.textContent).toContain("Nothing here yet.");
  });

  it("shows the emptyMessage in the mobile card container when items is empty", () => {
    render(EntityListPage, {
      props: baseProps({ items: [], emptyMessage: "Nothing here yet." }),
    });
    // getAllByText because both mobile and desktop show the message
    const empties = screen.getAllByText("Nothing here yet.");
    expect(empties.length).toBeGreaterThan(0);
  });

  it("shows the emptyMessage in the mobile section when search produces no results", async () => {
    const { container } = render(EntityListPage, {
      props: baseProps({
        searchFilter: (item: TestItem, q: string) => item.name.toLowerCase().includes(q),
        emptyMessage: "No match.",
      }),
    });
    const input = container.querySelector("input[type='text']");
    if (!(input instanceof HTMLInputElement)) throw new Error("expected text input");
    await fireEvent.input(input, { target: { value: "zzz" } });
    expect(screen.getAllByText("No match.").length).toBeGreaterThan(0);
  });

  // ── 7. Pagination renders when provided ───────────────────────────────────

  it("renders a pagination nav when pagination prop is provided", () => {
    const { container } = render(EntityListPage, {
      props: baseProps({
        pagination: { page: 1, limit: 10, total: 50, baseUrl: "/items" },
      }),
    });
    expect(container.querySelector("nav[aria-label='Pagination']")).not.toBeNull();
  });

  it("does not render pagination nav when pagination prop is absent", () => {
    const { container } = render(EntityListPage, { props: baseProps() });
    expect(container.querySelector("nav[aria-label='Pagination']")).toBeNull();
  });

  it("pagination shows correct totals from the pagination prop", () => {
    render(EntityListPage, {
      props: baseProps({
        pagination: { page: 1, limit: 10, total: 50, baseUrl: "/items" },
      }),
    });
    expect(screen.getByText(/50/)).toBeDefined();
  });

  // ── 8. Error banner shows on error prop ───────────────────────────────────

  it("renders AlertBanner when error prop is provided", () => {
    render(EntityListPage, {
      props: baseProps({ error: "Something went wrong." }),
    });
    expect(screen.getByText("Something went wrong.")).toBeDefined();
  });

  it("does not render AlertBanner when error prop is null", () => {
    render(EntityListPage, { props: baseProps({ error: null }) });
    expect(screen.queryByText("Something went wrong.")).toBeNull();
  });

  it("does not render AlertBanner when error prop is omitted", () => {
    const { container } = render(EntityListPage, { props: baseProps() });
    // The Alert component renders a role=alert element — should not be present
    expect(container.querySelector("[role='alert']")).toBeNull();
  });

  // ── 9. Page title renders in head ─────────────────────────────────────────

  it("sets document.title to '<title> - Humans' by default", () => {
    render(EntityListPage, { props: baseProps({ title: "Items" }) });
    expect(document.title).toBe("Items - Humans");
  });

  it("uses pageTitle over the derived default when pageTitle is provided", () => {
    render(EntityListPage, {
      props: baseProps({ title: "Items", pageTitle: "My Custom Title" }),
    });
    expect(document.title).toBe("My Custom Title");
  });

  // ── 10. Additional prop/rendering contracts ────────────────────────────────

  it("renders the Add button link when newHref is provided", () => {
    const { container } = render(EntityListPage, {
      props: baseProps({ newHref: "/items/new", newLabel: "Add Item" }),
    });
    const link = container.querySelector(`a[href='/items/new']`);
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Add Item");
  });

  it("defaults the Add button label to 'Add <title>' when newLabel is omitted", () => {
    const { container } = render(EntityListPage, {
      props: baseProps({ newHref: "/items/new", title: "Items" }),
    });
    const link = container.querySelector(`a[href='/items/new']`);
    expect(link?.textContent).toBe("Add Items");
  });

  it("does not render a new-item link when newHref is omitted", () => {
    const { container } = render(EntityListPage, { props: baseProps() });
    // No link to a "new" route should appear
    const links = Array.from(container.querySelectorAll("a")).filter(
      (a) => a.getAttribute("href")?.includes("/new") === true,
    );
    expect(links.length).toBe(0);
  });

  it("sorts items ascending by default when defaultSortKey and defaultSortDirection are set", () => {
    const { container } = render(EntityListPage, {
      props: baseProps({ defaultSortKey: "name", defaultSortDirection: "asc" }),
    });
    const cells = Array.from(container.querySelectorAll("[data-testid='desktop-cell']"));
    expect(cells[0].textContent).toBe("Alpha");
    expect(cells[1].textContent).toBe("Beta");
    expect(cells[2].textContent).toBe("Gamma");
  });

  it("sorts items descending when defaultSortDirection is desc", () => {
    const { container } = render(EntityListPage, {
      props: baseProps({ defaultSortKey: "name", defaultSortDirection: "desc" }),
    });
    const cells = Array.from(container.querySelectorAll("[data-testid='desktop-cell']"));
    expect(cells[0].textContent).toBe("Gamma");
    expect(cells[1].textContent).toBe("Beta");
    expect(cells[2].textContent).toBe("Alpha");
  });

  it("renders the colCount correctly with canDelete — Actions header is present", () => {
    const { container } = render(EntityListPage, {
      props: baseProps({ canDelete: true }),
    });
    const headers = container.querySelectorAll("th");
    // columns.length (2) + 1 Actions column = 3
    expect(headers.length).toBe(3);
  });

  it("renders the correct number of headers without canDelete", () => {
    const { container } = render(EntityListPage, { props: baseProps() });
    const headers = container.querySelectorAll("th");
    expect(headers.length).toBe(2);
  });

  it("uses the custom deleteMessage in the ConfirmDialog", async () => {
    render(EntityListPage, {
      props: baseProps({
        canDelete: true,
        deleteMessage: "This will permanently remove the record.",
      }),
    });
    const deleteButton = screen.getAllByRole("button", { name: "Delete" })[0];
    await fireEvent.click(deleteButton);
    expect(screen.getByText("This will permanently remove the record.")).toBeDefined();
  });

  // ── 11. Client-side pagination with clientPageSize ─────────────────────────

  it("renders only clientPageSize items when set", () => {
    const manyItems = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      createdAt: "2024-01-01",
    }));
    const { container } = render(EntityListPage, {
      props: baseProps({ items: manyItems, clientPageSize: 3 }),
    });
    const cells = container.querySelectorAll("[data-testid='desktop-cell']");
    expect(cells.length).toBe(3);
  });

  it("renders client-side pagination nav when clientPageSize is set", () => {
    const manyItems = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      createdAt: "2024-01-01",
    }));
    const { container } = render(EntityListPage, {
      props: baseProps({ items: manyItems, clientPageSize: 3 }),
    });
    expect(container.querySelector("nav[aria-label='Pagination']")).not.toBeNull();
  });

  it("shows second page items when Next is clicked in client pagination", async () => {
    const manyItems = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      createdAt: "2024-01-01",
    }));
    const { container } = render(EntityListPage, {
      props: baseProps({ items: manyItems, clientPageSize: 3 }),
    });
    const buttons = container.querySelectorAll("button");
    const nextButton = Array.from(buttons).find((b) => b.textContent?.includes("Next"));
    if (!nextButton) throw new Error("expected Next button");
    await fireEvent.click(nextButton);
    const cells = container.querySelectorAll("[data-testid='desktop-cell']");
    expect(cells.length).toBe(3);
    expect(cells[0].textContent).toBe("Item 3");
  });

  it("does not render client-side pagination when all items fit on one page", () => {
    const fewItems = [
      { id: "item-1", name: "Alpha", createdAt: "2024-01-01" },
      { id: "item-2", name: "Beta", createdAt: "2024-02-01" },
    ];
    const { container } = render(EntityListPage, {
      props: baseProps({ items: fewItems, clientPageSize: 5 }),
    });
    // Pagination should not show since total (2) <= pageSize (5)
    expect(container.querySelector("nav[aria-label='Pagination']")).toBeNull();
  });
});
