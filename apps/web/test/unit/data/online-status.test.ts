import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getOnlineStatus, initOnlineMonitor, destroyOnlineMonitor } from "$lib/data/online-status";

describe("online-status", () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addSpy = vi.spyOn(window, "addEventListener");
    removeSpy = vi.spyOn(window, "removeEventListener");
    // Reset module state
    destroyOnlineMonitor();
  });

  afterEach(() => {
    destroyOnlineMonitor();
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("returns true by default (online)", () => {
    expect(getOnlineStatus()).toBe(true);
  });

  it("registers online/offline event listeners on init", () => {
    initOnlineMonitor();
    const addedEvents = addSpy.mock.calls.map((c) => c[0]);
    expect(addedEvents).toContain("online");
    expect(addedEvents).toContain("offline");
  });

  it("removes event listeners on destroy", () => {
    initOnlineMonitor();
    destroyOnlineMonitor();
    const removedEvents = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain("online");
    expect(removedEvents).toContain("offline");
  });

  it("updates status to false when offline event fires", () => {
    initOnlineMonitor();
    window.dispatchEvent(new Event("offline"));
    expect(getOnlineStatus()).toBe(false);
  });

  it("updates status to true when online event fires after offline", () => {
    initOnlineMonitor();
    window.dispatchEvent(new Event("offline"));
    expect(getOnlineStatus()).toBe(false);
    window.dispatchEvent(new Event("online"));
    expect(getOnlineStatus()).toBe(true);
  });
});
