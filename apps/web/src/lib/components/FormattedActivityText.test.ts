import { describe, it, expect } from "vitest";
import { render } from "@testing-library/svelte";
import FormattedActivityText from "./FormattedActivityText.svelte";

describe("FormattedActivityText", () => {
  it("renders plain text", () => {
    const { container } = render(FormattedActivityText, {
      props: { text: "Hello World", query: "" },
    });
    expect(container.textContent).toContain("Hello World");
  });

  it("applies whitespace-pre-line to preserve line breaks", () => {
    const { container } = render(FormattedActivityText, {
      props: { text: "Line 1\nLine 2", query: "" },
    });
    const div = container.querySelector("[class*='whitespace-pre-line']");
    expect(div).not.toBeNull();
  });

  it("renders URLs as clickable anchor tags", () => {
    const { container } = render(FormattedActivityText, {
      props: { text: "Visit https://example.com for details", query: "" },
    });
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("https://example.com");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toContain("noopener");
  });

  it("renders multiple URLs as links", () => {
    const { container } = render(FormattedActivityText, {
      props: {
        text: "See https://one.com and https://two.com",
        query: "",
      },
    });
    const links = container.querySelectorAll("a");
    expect(links.length).toBe(2);
    expect(links[0].getAttribute("href")).toBe("https://one.com");
    expect(links[1].getAttribute("href")).toBe("https://two.com");
  });

  it("highlights search query in non-URL text", () => {
    const { container } = render(FormattedActivityText, {
      props: { text: "Hello World", query: "World" },
    });
    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe("World");
  });

  it("does not wrap URLs in highlight marks", () => {
    const { container } = render(FormattedActivityText, {
      props: {
        text: "Visit https://example.com today",
        query: "example",
      },
    });
    // The URL should be a link, not highlighted as search text
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain("example.com");
  });

  it("renders text without URLs the same as plain text", () => {
    const { container } = render(FormattedActivityText, {
      props: { text: "Just plain text here", query: "" },
    });
    expect(container.textContent).toBe("Just plain text here");
    expect(container.querySelector("a")).toBeNull();
  });

  it("handles http:// URLs", () => {
    const { container } = render(FormattedActivityText, {
      props: { text: "See http://legacy.example.com", query: "" },
    });
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("http://legacy.example.com");
  });
});
