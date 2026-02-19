import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import GeoInterestPicker from "./GeoInterestPicker.svelte";

describe("GeoInterestPicker", () => {
  const baseProps = { apiUrl: "http://localhost:8787" };

  it("renders in search mode by default", () => {
    render(GeoInterestPicker, { props: baseProps });
    expect(screen.getByPlaceholderText("Search existing geo-interests...")).toBeDefined();
  });

  it("shows the Geo-Interest label", () => {
    render(GeoInterestPicker, { props: baseProps });
    expect(screen.getByText("Geo-Interest")).toBeDefined();
  });

  it("shows 'or create new' link in search mode", () => {
    render(GeoInterestPicker, { props: baseProps });
    expect(screen.getByText("or create new")).toBeDefined();
  });

  it("switches to create mode when 'or create new' is clicked", async () => {
    render(GeoInterestPicker, { props: baseProps });
    const createLink = screen.getByText("or create new");
    await fireEvent.click(createLink);
    expect(screen.getByText("New Geo-Interest")).toBeDefined();
    expect(screen.getByText("search existing instead")).toBeDefined();
  });

  it("shows city and country fields in create mode", async () => {
    render(GeoInterestPicker, { props: baseProps });
    await fireEvent.click(screen.getByText("or create new"));
    expect(screen.getByPlaceholderText("e.g. Doha")).toBeDefined();
    expect(screen.getByPlaceholderText("Search countries...")).toBeDefined();
  });

  it("shows notes textarea by default", () => {
    render(GeoInterestPicker, { props: baseProps });
    expect(screen.getByPlaceholderText("Optional context...")).toBeDefined();
  });

  it("hides notes textarea when showNotes is false", () => {
    render(GeoInterestPicker, { props: { ...baseProps, showNotes: false } });
    expect(screen.queryByPlaceholderText("Optional context...")).toBeNull();
  });

  it("switches back to search mode from create mode", async () => {
    render(GeoInterestPicker, { props: baseProps });
    await fireEvent.click(screen.getByText("or create new"));
    await fireEvent.click(screen.getByText("search existing instead"));
    expect(screen.getByPlaceholderText("Search existing geo-interests...")).toBeDefined();
  });
});
