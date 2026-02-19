import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import AlertBanner from "./AlertBanner.svelte";

describe("AlertBanner", () => {
  it("renders message text", () => {
    render(AlertBanner, { props: { message: "Operation successful" } });
    expect(screen.getByText("Operation successful")).toBeDefined();
  });

  it("does not render when message is empty", () => {
    const { container } = render(AlertBanner, { props: { message: "" } });
    expect(container.querySelector("div.glass-card")).toBeNull();
  });

  it("applies success styles by default", () => {
    const { container } = render(AlertBanner, { props: { message: "Success" } });
    const banner = container.querySelector("div.glass-card");
    expect(banner?.className).toContain("bg-green-500/10");
  });

  it("applies error styles when type is error", () => {
    const { container } = render(AlertBanner, { props: { message: "Error!", type: "error" } });
    const banner = container.querySelector("div.glass-card");
    expect(banner?.className).toContain("bg-red-500/10");
  });

  it("shows code for error type", () => {
    render(AlertBanner, { props: { message: "Error", type: "error", code: "ERR_TEST" } });
    expect(screen.getByText("ERR_TEST")).toBeDefined();
  });

  it("shows truncated requestId for error type", () => {
    render(AlertBanner, {
      props: { message: "Error", type: "error", requestId: "12345678-abcd-efgh-ijkl-mnopqrstuvwx" },
    });
    expect(screen.getByText(/Ref: 12345678/)).toBeDefined();
  });

  it("does not show code/ref for success type", () => {
    const { container } = render(AlertBanner, {
      props: { message: "OK", type: "success", code: "CODE", requestId: "12345678-abcd" },
    });
    expect(container.querySelector(".font-mono")).toBeNull();
  });
});
