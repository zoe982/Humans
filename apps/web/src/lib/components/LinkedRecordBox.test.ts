import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import LinkedRecordBox from "./LinkedRecordBox.svelte";

function makeItemRowSnippet() {
  return createRawSnippet((getItem: () => { id: string; [key: string]: unknown }) => ({
    render: () => `<span>item-${getItem().id}</span>`,
    setup: () => {},
  }));
}

describe("LinkedRecordBox", () => {
  it("renders the title", () => {
    render(LinkedRecordBox, {
      props: {
        title: "Emails",
        items: [],
        itemRow: makeItemRowSnippet(),
      },
    });
    expect(screen.getByText("Emails")).toBeDefined();
  });

  it("shows empty message when no items", () => {
    render(LinkedRecordBox, {
      props: {
        title: "Emails",
        items: [],
        itemRow: makeItemRowSnippet(),
        emptyMessage: "No emails yet.",
      },
    });
    expect(screen.getByText("No emails yet.")).toBeDefined();
  });

  it("shows default empty message", () => {
    render(LinkedRecordBox, {
      props: {
        title: "Emails",
        items: [],
        itemRow: makeItemRowSnippet(),
      },
    });
    expect(screen.getByText("None yet.")).toBeDefined();
  });

  it("renders items when provided", () => {
    const items = [
      { id: "1", email: "a@b.com" },
      { id: "2", email: "c@d.com" },
    ];
    const { container } = render(LinkedRecordBox, {
      props: {
        title: "Emails",
        items,
        itemRow: makeItemRowSnippet(),
      },
    });
    // Should have item rows, not empty message
    expect(screen.queryByText("None yet.")).toBeNull();
    // Each item should have a wrapper div
    const itemDivs = container.querySelectorAll(".space-y-2 > div");
    expect(itemDivs.length).toBe(2);
  });

  it("shows Remove buttons when deleteFormAction is provided", () => {
    const items = [{ id: "1" }];
    render(LinkedRecordBox, {
      props: {
        title: "Emails",
        items,
        itemRow: makeItemRowSnippet(),
        deleteFormAction: "?/deleteEmail",
      },
    });
    expect(screen.getByText("Remove")).toBeDefined();
  });

  it("does not show Remove buttons without deleteFormAction", () => {
    const items = [{ id: "1" }];
    render(LinkedRecordBox, {
      props: {
        title: "Emails",
        items,
        itemRow: makeItemRowSnippet(),
      },
    });
    expect(screen.queryByText("Remove")).toBeNull();
  });
});
