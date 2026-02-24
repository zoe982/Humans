import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import AccountDropdown from "./AccountDropdown.svelte";

describe("AccountDropdown", () => {
  const baseProps = {
    userName: "Jane Smith",
    userRole: "agent",
    isAdmin: false,
  };

  it("renders the user name text", () => {
    render(AccountDropdown, { props: baseProps });
    expect(screen.getByText("Jane Smith")).toBeDefined();
  });

  it("renders the user role text", () => {
    render(AccountDropdown, { props: baseProps });
    expect(screen.getByText("agent")).toBeDefined();
  });

  it("does not render an avatar image when avatarUrl is not provided", () => {
    const { container } = render(AccountDropdown, { props: baseProps });
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows avatar image when avatarUrl is provided", () => {
    render(AccountDropdown, {
      props: { ...baseProps, avatarUrl: "https://example.com/avatar.jpg" },
    });
    const img = screen.getByRole("img", { name: "Jane Smith" });
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/avatar.jpg");
  });
});
