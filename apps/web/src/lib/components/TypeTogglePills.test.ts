import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import TypeTogglePills from "./TypeTogglePills.svelte";

describe("TypeTogglePills", () => {
  it("renders all four type buttons", () => {
    render(TypeTogglePills, { props: {} });
    expect(screen.getByText("Client")).toBeDefined();
    expect(screen.getByText("Trainer")).toBeDefined();
    expect(screen.getByText("Travel Agent")).toBeDefined();
    expect(screen.getByText("Flight Broker")).toBeDefined();
  });

  it("renders hidden inputs for pre-selected types", () => {
    const { container } = render(TypeTogglePills, {
      props: { selected: ["client", "trainer"] },
    });
    const hiddens = container.querySelectorAll('input[type="hidden"][name="types"]');
    expect(hiddens.length).toBe(2);
    const values = Array.from(hiddens).map((el) => (el as HTMLInputElement).value);
    expect(values).toContain("client");
    expect(values).toContain("trainer");
  });

  it("uses custom name for hidden inputs", () => {
    const { container } = render(TypeTogglePills, {
      props: { selected: ["client"], name: "humanTypes" },
    });
    const hidden = container.querySelector('input[type="hidden"][name="humanTypes"]');
    expect(hidden).not.toBeNull();
  });

  it("toggles a type on click", async () => {
    const onchange = vi.fn();
    render(TypeTogglePills, { props: { onchange } });
    const clientBtn = screen.getByText("Client");
    await fireEvent.click(clientBtn);
    expect(onchange).toHaveBeenCalledWith(["client"]);
  });

  it("deselects a type on second click", async () => {
    const onchange = vi.fn();
    render(TypeTogglePills, { props: { selected: ["client"], onchange } });
    const clientBtn = screen.getByText("Client");
    await fireEvent.click(clientBtn);
    expect(onchange).toHaveBeenCalledWith([]);
  });

  it("renders no hidden inputs when nothing is selected", () => {
    const { container } = render(TypeTogglePills, { props: {} });
    const hiddens = container.querySelectorAll('input[type="hidden"]');
    expect(hiddens.length).toBe(0);
  });
});
