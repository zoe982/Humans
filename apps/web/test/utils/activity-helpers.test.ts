import { describe, it, expect } from "vitest";
import { parseActivityContent } from "$lib/utils/activity-helpers";

describe("parseActivityContent", () => {
  // --- Existing behavior: parse from notes ---

  it("extracts sender name from notes with body present", () => {
    const result = parseActivityContent({
      body: "Hello there!",
      notes: "Outbound from Barbara\nHello there!",
      direction: "outbound",
    });
    expect(result.senderName).toBe("Barbara");
    expect(result.text).toBe("Hello there!");
    expect(result.direction).toBe("outbound");
  });

  it("extracts sender name and text from notes when no body", () => {
    const result = parseActivityContent({
      body: null,
      notes: "Inbound from Michael\nHi, how are you?",
      direction: "inbound",
    });
    expect(result.senderName).toBe("Michael");
    expect(result.text).toBe("Hi, how are you?");
    expect(result.direction).toBe("inbound");
  });

  it("returns null senderName when notes say Unknown", () => {
    const result = parseActivityContent({
      body: "test",
      notes: "Outbound from Unknown\ntest",
      direction: "outbound",
    });
    expect(result.senderName).toBeNull();
  });

  it("returns null for all fields when body and notes are null", () => {
    const result = parseActivityContent({
      body: null,
      notes: null,
      direction: null,
    });
    expect(result.text).toBeNull();
    expect(result.direction).toBeNull();
    expect(result.senderName).toBeNull();
  });

  // --- New: senderName column takes priority ---

  it("uses senderName column over notes-parsed name", () => {
    const result = parseActivityContent({
      body: "Hello!",
      notes: "Outbound from Unknown\nHello!",
      direction: "outbound",
      senderName: "Barbara",
    });
    expect(result.senderName).toBe("Barbara");
  });

  it("uses senderName column even when notes have a different name", () => {
    const result = parseActivityContent({
      body: "Hello!",
      notes: "Outbound from OldName\nHello!",
      direction: "outbound",
      senderName: "Barbara Smith",
    });
    expect(result.senderName).toBe("Barbara Smith");
  });

  // --- New: ownerName fallback for outbound ---

  it("falls back to ownerName for outbound when no senderName and notes say Unknown", () => {
    const result = parseActivityContent({
      body: "Test message",
      notes: "Outbound from Unknown\nTest message",
      direction: "outbound",
      ownerName: "Barbara",
    });
    expect(result.senderName).toBe("Barbara");
  });

  it("does not use ownerName for inbound messages", () => {
    const result = parseActivityContent({
      body: "Test message",
      notes: "Inbound from Unknown\nTest message",
      direction: "inbound",
      ownerName: "Barbara",
    });
    // ownerName should not be used for inbound
    expect(result.senderName).toBeNull();
  });

  // --- New: humanName fallback for inbound ---

  it("falls back to humanName for inbound when no senderName and notes say Unknown", () => {
    const result = parseActivityContent({
      body: "Test message",
      notes: "Inbound from Unknown\nTest message",
      direction: "inbound",
      humanName: "Michael Jones",
    });
    expect(result.senderName).toBe("Michael Jones");
  });

  it("does not use humanName for outbound messages", () => {
    const result = parseActivityContent({
      body: "Test message",
      notes: "Outbound from Unknown\nTest message",
      direction: "outbound",
      humanName: "Michael Jones",
    });
    // humanName should not be used for outbound
    expect(result.senderName).toBeNull();
  });

  // --- Priority: senderName > notes-parsed > ownerName/humanName ---

  it("senderName column wins over ownerName fallback", () => {
    const result = parseActivityContent({
      body: "Hello",
      notes: "Outbound from Unknown\nHello",
      direction: "outbound",
      senderName: "Barbara via Column",
      ownerName: "Barbara via Owner",
    });
    expect(result.senderName).toBe("Barbara via Column");
  });

  it("notes-parsed name wins over ownerName fallback", () => {
    const result = parseActivityContent({
      body: "Hello",
      notes: "Outbound from Barbara Notes\nHello",
      direction: "outbound",
      ownerName: "Barbara Owner",
    });
    expect(result.senderName).toBe("Barbara Notes");
  });

  it("notes-parsed name wins over humanName fallback", () => {
    const result = parseActivityContent({
      body: "Hello",
      notes: "Inbound from Michael Notes\nHello",
      direction: "inbound",
      humanName: "Michael Human",
    });
    expect(result.senderName).toBe("Michael Notes");
  });
});
