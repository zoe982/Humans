import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import HighlightText from "./HighlightText.svelte";

describe("HighlightText", () => {
  it("renders the full text when query is empty", () => {
    const { container } = render(HighlightText, {
      props: { text: "Hello World", query: "" },
    });
    expect(container.textContent).toContain("Hello World");
  });

  it("does not render any mark elements when query is empty", () => {
    const { container } = render(HighlightText, {
      props: { text: "Hello World", query: "" },
    });
    expect(container.querySelector("mark")).toBeNull();
  });

  it("highlights the matching substring", () => {
    const { container } = render(HighlightText, {
      props: { text: "Hello World", query: "World" },
    });
    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe("World");
  });

  it("handles case-insensitive matching", () => {
    const { container } = render(HighlightText, {
      props: { text: "Hello World", query: "hello" },
    });
    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark?.textContent?.toLowerCase()).toBe("hello");
  });

  it("preserves the original text casing in the highlight", () => {
    const { container } = render(HighlightText, {
      props: { text: "Anthropic", query: "anthro" },
    });
    const mark = container.querySelector("mark");
    expect(mark?.textContent).toBe("Anthro");
  });

  it("renders non-highlighted portions as plain text", () => {
    const { container } = render(HighlightText, {
      props: { text: "Hello World", query: "World" },
    });
    expect(container.textContent).toContain("Hello ");
    const mark = container.querySelector("mark");
    expect(mark?.textContent).toBe("World");
  });

  it("highlights a mid-string match", () => {
    const { container } = render(HighlightText, {
      props: { text: "John Smith", query: "Smit" },
    });
    const mark = container.querySelector("mark");
    expect(mark?.textContent).toBe("Smit");
  });

  it("highlights multiple occurrences of the query", () => {
    const { container } = render(HighlightText, {
      props: { text: "banana", query: "an" },
    });
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(2);
  });

  it("does not render a mark element when query does not match", () => {
    const { container } = render(HighlightText, {
      props: { text: "Hello World", query: "zzz" },
    });
    expect(container.querySelector("mark")).toBeNull();
    expect(container.textContent).toContain("Hello World");
  });

  it("wraps content in a span when class prop is provided", () => {
    const { container } = render(HighlightText, {
      props: { text: "Hello", query: "", class: "my-class" },
    });
    const span = container.querySelector("span.my-class");
    expect(span).not.toBeNull();
  });

  it("does not wrap in a span when class prop is not provided", () => {
    const { container } = render(HighlightText, {
      props: { text: "Hello", query: "" },
    });
    expect(container.querySelector("span")).toBeNull();
  });

  it("handles whitespace-only query as empty (no highlights)", () => {
    const { container } = render(HighlightText, {
      props: { text: "Hello World", query: "   " },
    });
    expect(container.querySelector("mark")).toBeNull();
  });

  it("applies search-highlight class to mark elements", () => {
    const { container } = render(HighlightText, {
      props: { text: "Hello World", query: "World" },
    });
    const mark = container.querySelector("mark");
    expect(mark?.className).toContain("search-highlight");
  });
});
