import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import SearchableSelect from "./SearchableSelect.svelte";

describe("SearchableSelect", () => {
  const options = ["Argentina", "Australia", "Brazil", "Canada", "Chile"] as const;

  it("renders a text input", () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country" },
    });
    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBe(1);
  });

  it("renders a hidden input with the given name", () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country" },
    });
    const hidden = container.querySelector('input[type="hidden"][name="country"]');
    expect(hidden).not.toBeNull();
  });

  it("uses provided placeholder", () => {
    render(SearchableSelect, {
      props: { options, name: "country", placeholder: "Pick one..." },
    });
    expect(screen.getByPlaceholderText("Pick one...")).toBeDefined();
  });

  it("uses default placeholder when not provided", () => {
    render(SearchableSelect, {
      props: { options, name: "country" },
    });
    expect(screen.getByPlaceholderText("Search...")).toBeDefined();
  });

  it("shows dropdown on focus", async () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country" },
    });
    const input = container.querySelector('input[type="text"]')!;
    await fireEvent.focus(input);
    // All options should be visible
    expect(screen.getByText("Argentina")).toBeDefined();
    expect(screen.getByText("Brazil")).toBeDefined();
  });

  it("filters options based on query", async () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country" },
    });
    const input = container.querySelector('input[type="text"]')!;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "Ar" } });

    expect(screen.getByText("Argentina")).toBeDefined();
    expect(screen.queryByText("Brazil")).toBeNull();
  });

  it("shows empty message when no options match", async () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country", emptyMessage: "Nothing found" },
    });
    const input = container.querySelector('input[type="text"]')!;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "zzz" } });

    expect(screen.getByText("Nothing found")).toBeDefined();
  });

  it("pre-fills with value prop", () => {
    const { container } = render(SearchableSelect, {
      props: { options, name: "country", value: "Brazil" },
    });
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden.value).toBe("Brazil");
  });
});
