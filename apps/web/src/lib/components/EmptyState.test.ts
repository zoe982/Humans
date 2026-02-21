import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import EmptyState from "./EmptyState.svelte";

describe("EmptyState", () => {
  it("renders the message text", () => {
    render(EmptyState, { props: { message: "No records found" } });
    expect(screen.getByText("No records found")).toBeDefined();
  });

  it("renders the message in a paragraph element", () => {
    const { container } = render(EmptyState, { props: { message: "Nothing here yet" } });
    const p = container.querySelector("p");
    expect(p?.textContent).toBe("Nothing here yet");
  });

  it("does not render the icon container when icon is not provided", () => {
    const { container } = render(EmptyState, { props: { message: "Empty" } });
    // The icon wrapper div has class "mb-3"
    const iconWrapper = container.querySelector(".mb-3");
    expect(iconWrapper).toBeNull();
  });

  it("does not render the action container when action snippet is not provided", () => {
    const { container } = render(EmptyState, { props: { message: "Empty" } });
    const actionWrapper = container.querySelector(".mt-4");
    expect(actionWrapper).toBeNull();
  });

  it("renders action snippet content when provided", () => {
    const action = createRawSnippet(() => ({
      render: () => `<a href="/new">Create new record</a>`,
      setup: () => {},
    }));
    render(EmptyState, { props: { message: "No items", action } });
    expect(screen.getByText("Create new record")).toBeDefined();
  });

  it("renders action inside a mt-4 wrapper div", () => {
    const action = createRawSnippet(() => ({
      render: () => `<button>Add</button>`,
      setup: () => {},
    }));
    const { container } = render(EmptyState, { props: { message: "Empty", action } });
    const wrapper = container.querySelector(".mt-4");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.querySelector("button")).not.toBeNull();
  });

  it("renders the outer layout container", () => {
    const { container } = render(EmptyState, { props: { message: "Nothing" } });
    const outer = container.querySelector(".flex.flex-col");
    expect(outer).not.toBeNull();
  });
});
