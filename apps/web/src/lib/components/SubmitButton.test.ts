import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import SubmitButton from "./SubmitButton.svelte";

describe("SubmitButton", () => {
  it("renders the label text", () => {
    render(SubmitButton, { props: { label: "Save Changes" } });
    expect(screen.getByText("Save Changes")).toBeDefined();
  });

  it("renders a submit button", () => {
    const { container } = render(SubmitButton, { props: { label: "Submit" } });
    const btn = container.querySelector('button[type="submit"]');
    expect(btn).not.toBeNull();
  });

  it("is not disabled when submitting is false", () => {
    const { container } = render(SubmitButton, {
      props: { label: "Save", submitting: false },
    });
    const btn = container.querySelector("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("is disabled when submitting is true", () => {
    const { container } = render(SubmitButton, {
      props: { label: "Save", submitting: true },
    });
    const btn = container.querySelector("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("shows a loading spinner when submitting is true", () => {
    const { container } = render(SubmitButton, {
      props: { label: "Saving...", submitting: true },
    });
    // Loader2 renders an SVG
    const spinner = container.querySelector("svg");
    expect(spinner).not.toBeNull();
  });

  it("does not show a spinner when submitting is false", () => {
    const { container } = render(SubmitButton, {
      props: { label: "Save", submitting: false },
    });
    const spinner = container.querySelector("svg");
    expect(spinner).toBeNull();
  });

  it("defaults submitting to false — not disabled by default", () => {
    const { container } = render(SubmitButton, { props: { label: "Go" } });
    const btn = container.querySelector("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("applies extra className when class prop is provided", () => {
    const { container } = render(SubmitButton, {
      props: { label: "Save", class: "btn-primary" },
    });
    const btn = container.querySelector("button");
    expect(btn?.className).toContain("btn-primary");
  });
});
