import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/svelte";
import OfflineBanner from "./OfflineBanner.svelte";

vi.mock("$lib/data/online-status", () => ({
  getOnlineStatus: vi.fn().mockReturnValue(true),
  initOnlineMonitor: vi.fn(),
  destroyOnlineMonitor: vi.fn(),
}));

import { getOnlineStatus } from "$lib/data/online-status";
const mockGetOnline = vi.mocked(getOnlineStatus);

describe("OfflineBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when online", () => {
    mockGetOnline.mockReturnValue(true);
    const { container } = render(OfflineBanner);
    expect(container.querySelector("[role='status']")).toBeNull();
  });

  it("renders banner when offline", () => {
    mockGetOnline.mockReturnValue(false);
    const { container } = render(OfflineBanner);
    // Component should show offline message
    const text = container.textContent;
    expect(text).toContain("offline");
  });
});
