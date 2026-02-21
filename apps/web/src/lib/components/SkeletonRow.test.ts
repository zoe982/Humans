import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/svelte";

// SkeletonRow renders a bare <tr> at the component root. Svelte 5 compiles this
// to `from_html('<tr></tr>')`, which sets innerHTML on a <template> element.
// happy-dom does not correctly parse table-row elements inside <template>
// (it produces a text node instead of an element), causing Svelte's cloneNode
// call to fail. We patch HTMLTemplateElement to fix table-element parsing before
// importing the component.
beforeAll(() => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    HTMLTemplateElement.prototype,
    "innerHTML"
  );

  if (originalDescriptor?.set) {
    Object.defineProperty(HTMLTemplateElement.prototype, "innerHTML", {
      get: originalDescriptor.get,
      set(html: string) {
        // Check if this looks like a table row/cell fragment
        const tableFragmentRe = /^\s*<(tr|td|th|thead|tbody|tfoot|colgroup|col|caption)/i;
        if (tableFragmentRe.test(html)) {
          // Parse the fragment in the correct context using a temporary table
          const wrapper = document.createElement("div");
          // Determine the correct wrapper tag
          const tag = html.trim().match(/^<(\w+)/i)?.[1]?.toLowerCase();
          let contextHtml: string;
          if (tag === "tr") {
            contextHtml = `<table><tbody>${html}</tbody></table>`;
          } else if (tag === "td" || tag === "th") {
            contextHtml = `<table><tbody><tr>${html}</tr></tbody></table>`;
          } else {
            contextHtml = `<table>${html}</table>`;
          }
          wrapper.innerHTML = contextHtml;
          // Extract the parsed nodes into the template content
          const table = wrapper.firstElementChild!;
          let source: Element | null = table;
          if (tag === "tr") source = table.querySelector("tbody");
          else if (tag === "td" || tag === "th") source = table.querySelector("tr");
          if (source) {
            while (this.content.firstChild) {
              this.content.removeChild(this.content.firstChild);
            }
            while (source.firstChild) {
              this.content.appendChild(source.firstChild);
            }
            return;
          }
        }
        // Fall through to original setter
        originalDescriptor.set!.call(this, html);
      },
      configurable: true,
    });
  }
});

// Import after patching
const { default: SkeletonRowWrapper } = await import("./SkeletonRowWrapper.test.svelte");

describe("SkeletonRow", () => {
  it("renders a table row element", () => {
    const { container } = render(SkeletonRowWrapper, { props: {} });
    expect(container.querySelector("tr")).not.toBeNull();
  });

  it("renders default 4 table cells", () => {
    const { container } = render(SkeletonRowWrapper, { props: {} });
    const cells = container.querySelectorAll("td");
    expect(cells.length).toBe(4);
  });

  it("renders the correct number of cells when columns=6", () => {
    const { container } = render(SkeletonRowWrapper, { props: { columns: 6 } });
    const cells = container.querySelectorAll("td");
    expect(cells.length).toBe(6);
  });

  it("renders 1 cell when columns=1", () => {
    const { container } = render(SkeletonRowWrapper, { props: { columns: 1 } });
    const cells = container.querySelectorAll("td");
    expect(cells.length).toBe(1);
  });

  it("first cell skeleton has w-32 class", () => {
    const { container } = render(SkeletonRowWrapper, { props: {} });
    const firstCell = container.querySelectorAll("td")[0];
    const skeleton = firstCell?.querySelector("div");
    expect(skeleton?.className).toContain("w-32");
  });

  it("non-first cell skeletons have w-20 class", () => {
    const { container } = render(SkeletonRowWrapper, { props: {} });
    const secondCell = container.querySelectorAll("td")[1];
    const skeleton = secondCell?.querySelector("div");
    expect(skeleton?.className).toContain("w-20");
  });

  it("each cell contains one skeleton element", () => {
    const { container } = render(SkeletonRowWrapper, { props: { columns: 3 } });
    const cells = container.querySelectorAll("td");
    cells.forEach((cell) => {
      const skeletonDiv = cell.querySelector("div");
      expect(skeletonDiv).not.toBeNull();
    });
  });
});
