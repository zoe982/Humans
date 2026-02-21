import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import MobileNav from "./MobileNav.svelte";

// MobileNav uses Sheet.Root (bits-ui) for the slide-out drawer. The Sheet
// content is portal-rendered and only materialises in the DOM after the
// trigger button is clicked. Tests that need to inspect nav links, user info,
// or the sign-out button must open the sheet first.

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/humans", label: "Humans" },
  { href: "/clients", label: "Clients" },
];

describe("MobileNav", () => {
  // ── Static/initial-render tests ────────────────────────────────────────

  it("renders the hamburger toggle button", () => {
    render(MobileNav, {
      props: { links, userName: "Jane Doe", userRole: "Agent" },
    });
    expect(screen.getByRole("button", { name: "Open menu" })).toBeDefined();
  });

  it("toggle button has aria-expanded=false when closed", () => {
    const { container } = render(MobileNav, {
      props: { links, userName: "Jane Doe", userRole: "Agent" },
    });
    const btn = container.querySelector('button[aria-label="Open menu"]');
    expect(btn?.getAttribute("aria-expanded")).toBe("false");
  });

  it("outer wrapper has sm:hidden class for desktop hiding", () => {
    const { container } = render(MobileNav, {
      props: { links, userName: "Jane Doe", userRole: "Agent" },
    });
    const outer = container.querySelector(".sm\\:hidden");
    expect(outer).not.toBeNull();
  });

  it("does not render avatar image when avatarUrl is not provided", () => {
    const { container } = render(MobileNav, {
      props: { links, userName: "Jane Doe", userRole: "Agent" },
    });
    // Before the sheet opens, no image should be present
    expect(container.querySelector("img")).toBeNull();
  });

  // ── Post-open tests (open the sheet first) ─────────────────────────────

  it("renders user name in nav after opening the menu", async () => {
    render(MobileNav, {
      props: { links, userName: "Jane Doe", userRole: "Agent" },
    });
    const toggleBtn = screen.getByRole("button", { name: "Open menu" });
    await fireEvent.click(toggleBtn);
    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeDefined();
    });
  });

  it("renders user role in nav after opening the menu", async () => {
    render(MobileNav, {
      props: { links, userName: "Jane Doe", userRole: "Agent" },
    });
    const toggleBtn = screen.getByRole("button", { name: "Open menu" });
    await fireEvent.click(toggleBtn);
    await waitFor(() => {
      expect(screen.getByText("Agent")).toBeDefined();
    });
  });

  it("renders all navigation link labels after opening the menu", async () => {
    render(MobileNav, {
      props: { links, userName: "Jane Doe", userRole: "Agent" },
    });
    const toggleBtn = screen.getByRole("button", { name: "Open menu" });
    await fireEvent.click(toggleBtn);
    await waitFor(() => {
      expect(screen.getByText("Dashboard")).toBeDefined();
      expect(screen.getByText("Humans")).toBeDefined();
      expect(screen.getByText("Clients")).toBeDefined();
    });
  });

  it("nav links have correct hrefs after opening the menu", async () => {
    render(MobileNav, {
      props: { links, userName: "Jane Doe", userRole: "Agent" },
    });
    const toggleBtn = screen.getByRole("button", { name: "Open menu" });
    await fireEvent.click(toggleBtn);
    await waitFor(() => {
      const dashboardLink = document.querySelector('a[href="/dashboard"]');
      const humansLink = document.querySelector('a[href="/humans"]');
      expect(dashboardLink).not.toBeNull();
      expect(humansLink).not.toBeNull();
    });
  });

  it("renders Sign out text after opening the menu", async () => {
    render(MobileNav, {
      props: { links, userName: "Jane Doe", userRole: "Agent" },
    });
    const toggleBtn = screen.getByRole("button", { name: "Open menu" });
    await fireEvent.click(toggleBtn);
    await waitFor(() => {
      expect(screen.getByText("Sign out")).toBeDefined();
    });
  });

  it("renders avatar image after opening the menu when avatarUrl is provided", async () => {
    render(MobileNav, {
      props: {
        links,
        userName: "Jane Doe",
        userRole: "Agent",
        avatarUrl: "https://example.com/avatar.jpg",
      },
    });
    const toggleBtn = screen.getByRole("button", { name: "Open menu" });
    await fireEvent.click(toggleBtn);
    await waitFor(() => {
      const img = document.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toBe("https://example.com/avatar.jpg");
      expect(img?.getAttribute("alt")).toBe("Jane Doe");
    });
  });

  it("nav has aria-label 'Mobile navigation' after opening the menu", async () => {
    render(MobileNav, {
      props: { links, userName: "Jane Doe", userRole: "Agent" },
    });
    const toggleBtn = screen.getByRole("button", { name: "Open menu" });
    await fireEvent.click(toggleBtn);
    await waitFor(() => {
      const nav = document.querySelector('nav[aria-label="Mobile navigation"]');
      expect(nav).not.toBeNull();
    });
  });
});
