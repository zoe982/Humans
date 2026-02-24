import { describe, it, expect } from "vitest";
import { classifyChannel } from "../../../src/services/front-sync";

describe("classifyChannel", () => {
  // --- Channel ID takes priority over everything ---

  it("classifies Instagram channel ID as social_message", () => {
    expect(classifyChannel("cha_lxdcw", "any@handle", "email")).toBe("social_message");
  });

  it("classifies Facebook channel ID as social_message", () => {
    expect(classifyChannel("cha_lxdeo", "any", undefined)).toBe("social_message");
  });

  it("classifies WhatsApp channel ID as whatsapp_message", () => {
    expect(classifyChannel("cha_m1868", "any", undefined)).toBe("whatsapp_message");
  });

  it("classifies email channel ID as email", () => {
    expect(classifyChannel("cha_lxe5c", "any", undefined)).toBe("email");
  });

  // --- Message type used when no channel ID ---

  it("classifies custom type with phone handle as whatsapp_message", () => {
    expect(classifyChannel(undefined, "+1234567890", "custom")).toBe("whatsapp_message");
  });

  it("classifies custom type with social handle as social_message", () => {
    expect(classifyChannel(undefined, "username", "custom")).toBe("social_message");
  });

  it("classifies custom type with @ handle as social_message (THE BUG FIX)", () => {
    expect(classifyChannel(undefined, "user@instagram", "custom")).toBe("social_message");
  });

  it("classifies email type with @ handle as email", () => {
    expect(classifyChannel(undefined, "user@example.com", "email")).toBe("email");
  });

  // --- Handle fallback when no channel ID and no message type ---

  it("falls back to email for @ handle when no type", () => {
    expect(classifyChannel(undefined, "user@example.com", undefined)).toBe("email");
  });

  it("falls back to whatsapp_message for phone handle when no type", () => {
    expect(classifyChannel(undefined, "+1 202 555 1234", undefined)).toBe("whatsapp_message");
  });

  it("falls back to social_message for plain handle when no type", () => {
    expect(classifyChannel(undefined, "username", undefined)).toBe("social_message");
  });

  it("channel ID takes priority over message type", () => {
    // Instagram channel ID with email message type — channel ID wins
    expect(classifyChannel("cha_lxdcw", "user@example.com", "email")).toBe("social_message");
  });
});
