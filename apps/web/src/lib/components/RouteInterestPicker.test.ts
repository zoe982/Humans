import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import RouteInterestPicker from "./RouteInterestPicker.svelte";

describe("RouteInterestPicker", () => {
  const baseProps = { apiUrl: "http://localhost:8787" };

  it("renders origin city input with placeholder", () => {
    render(RouteInterestPicker, { props: baseProps });
    expect(screen.getByPlaceholderText("e.g. London")).toBeDefined();
  });

  it("renders destination city input with placeholder", () => {
    render(RouteInterestPicker, { props: baseProps });
    expect(screen.getByPlaceholderText("e.g. Paris")).toBeDefined();
  });

  it("shows notes textarea by default", () => {
    render(RouteInterestPicker, { props: baseProps });
    expect(screen.getByPlaceholderText("Optional context...")).toBeDefined();
  });

  it("hides notes textarea when showNotes is false", () => {
    render(RouteInterestPicker, { props: { ...baseProps, showNotes: false } });
    expect(screen.queryByPlaceholderText("Optional context...")).toBeNull();
  });

  it("shows frequency section by default", () => {
    render(RouteInterestPicker, { props: baseProps });
    expect(screen.getByText("Frequency")).toBeDefined();
  });

  it("hides frequency section when showFrequency is false", () => {
    render(RouteInterestPicker, { props: { ...baseProps, showFrequency: false } });
    expect(screen.queryByText("Frequency")).toBeNull();
  });

  it("shows travel date fields by default", () => {
    render(RouteInterestPicker, { props: baseProps });
    expect(screen.getByText("Travel Date (optional)")).toBeDefined();
  });

  it("hides travel date fields when showTravelDate is false", () => {
    render(RouteInterestPicker, { props: { ...baseProps, showTravelDate: false } });
    expect(screen.queryByText("Travel Date (optional)")).toBeNull();
  });

  it("has a swap button with aria-label 'Swap origin and destination'", () => {
    render(RouteInterestPicker, { props: baseProps });
    expect(screen.getByRole("button", { name: "Swap origin and destination" })).toBeDefined();
  });
});
