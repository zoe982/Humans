import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import UpdateBanner from "./UpdateBanner.svelte";

// The $app/stores mock (test/mocks/app-stores.ts) exports `updated` with
// `subscribe: writable(false).subscribe`, so $updated is false by default.
// The banner must only appear when $updated is true — the mock covers the
// default false case without any additional setup.

describe("UpdateBanner", () => {
  it("does not render banner text when $updated is false", () => {
    render(UpdateBanner);
    expect(screen.queryByText("A new version is available")).toBeNull();
  });

  it("does not render the Refresh button when $updated is false", () => {
    render(UpdateBanner);
    expect(screen.queryByText("Refresh")).toBeNull();
  });

  it("renders as a top-level element without throwing", () => {
    // Ensures the component mounts cleanly without uncaught errors.
    // The banner content is gated on $updated, which defaults to false in
    // the test mock, so there is nothing visible to query — but the render
    // itself must succeed.
    const { container } = render(UpdateBanner);
    expect(container).toBeDefined();
  });
});
