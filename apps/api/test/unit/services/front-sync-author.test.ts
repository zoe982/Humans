import { describe, it, expect } from "vitest";
import { resolveAuthorName } from "../../../src/services/front-sync";

// Minimal types matching Front API shape
function makeMessage(overrides: {
  is_inbound?: boolean;
  author?: { handle: string; name?: string } | null;
  recipients?: { handle: string; role: string; name?: string }[];
} = {}) {
  return {
    id: "msg_1",
    type: "email",
    is_inbound: overrides.is_inbound ?? false,
    is_draft: false,
    created_at: 1700000000,
    blurb: "test",
    body: "test body",
    text: "test text",
    author: overrides.author === null ? undefined : (overrides.author ?? { handle: "barbara@petairvalet.com", name: "Barbara" }),
    recipients: overrides.recipients ?? [{ handle: "michael@example.com", role: "to" }],
  };
}

function makeConversation(overrides: {
  recipient?: { handle: string; name?: string } | null;
} = {}) {
  return {
    id: "cnv_1",
    subject: "Test conversation",
    recipient: overrides.recipient === null ? undefined : (overrides.recipient ?? { handle: "michael@example.com", name: "Michael" }),
  };
}

function makeColleagueCache(colleagues: { id: string; email: string; name: string }[] = []) {
  return colleagues;
}

describe("resolveAuthorName", () => {
  // --- Priority 1: message.author.name ---

  it("returns message.author.name when available", () => {
    const msg = makeMessage({ author: { handle: "barbara@petairvalet.com", name: "Barbara" } });
    const conv = makeConversation();
    const result = resolveAuthorName(msg, conv, []);
    expect(result).toBe("Barbara");
  });

  // --- Priority 2: message.author.handle → colleague name for outbound ---

  it("resolves outbound author handle to colleague name", () => {
    const msg = makeMessage({
      author: { handle: "barbara@petairvalet.com" }, // no name
    });
    const conv = makeConversation();
    const colleagues = makeColleagueCache([
      { id: "col_1", email: "barbara@petairvalet.com", name: "Barbara Smith" },
    ]);
    const result = resolveAuthorName(msg, conv, colleagues);
    expect(result).toBe("Barbara Smith");
  });

  it("returns author handle as-is when no colleague match and no name", () => {
    const msg = makeMessage({
      author: { handle: "unknown@company.com" }, // no name, no colleague match
    });
    const conv = makeConversation();
    const result = resolveAuthorName(msg, conv, []);
    expect(result).toBe("unknown@company.com");
  });

  // --- Priority 3: recipients "from" role name ---

  it("falls back to recipients from-role name when author is null", () => {
    const msg = makeMessage({
      author: null,
      recipients: [
        { handle: "michael@example.com", role: "from", name: "Michael Jones" },
        { handle: "info@petairvalet.com", role: "to" },
      ],
    });
    const conv = makeConversation();
    const result = resolveAuthorName(msg, conv, []);
    expect(result).toBe("Michael Jones");
  });

  // --- Priority 4: recipients "from" role handle → colleague name for outbound ---

  it("resolves from-recipient handle to colleague name for outbound messages", () => {
    const msg = makeMessage({
      is_inbound: false,
      author: null,
      recipients: [
        { handle: "barbara@petairvalet.com", role: "from" },
        { handle: "michael@example.com", role: "to" },
      ],
    });
    const conv = makeConversation();
    const colleagues = makeColleagueCache([
      { id: "col_1", email: "barbara@petairvalet.com", name: "Barbara" },
    ]);
    const result = resolveAuthorName(msg, conv, colleagues);
    expect(result).toBe("Barbara");
  });

  it("returns from-recipient handle as-is when no name and no colleague match", () => {
    const msg = makeMessage({
      author: null,
      recipients: [
        { handle: "someone@example.com", role: "from" },
        { handle: "info@petairvalet.com", role: "to" },
      ],
    });
    const conv = makeConversation();
    const result = resolveAuthorName(msg, conv, []);
    expect(result).toBe("someone@example.com");
  });

  // --- Priority 5: conversation.recipient.name for inbound ---

  it("falls back to conversation recipient name for inbound messages", () => {
    const msg = makeMessage({
      is_inbound: true,
      author: null,
      recipients: [
        { handle: "info@petairvalet.com", role: "to" },
      ],
    });
    const conv = makeConversation({ recipient: { handle: "michael@example.com", name: "Michael" } });
    const result = resolveAuthorName(msg, conv, []);
    expect(result).toBe("Michael");
  });

  it("does not use conversation recipient name for outbound messages", () => {
    const msg = makeMessage({
      is_inbound: false,
      author: null,
      recipients: [],
    });
    const conv = makeConversation({ recipient: { handle: "michael@example.com", name: "Michael" } });
    const result = resolveAuthorName(msg, conv, []);
    // Should fall through to "Unknown" since outbound should not use recipient name
    expect(result).toBe("Unknown");
  });

  // --- Priority 6: "Unknown" fallback ---

  it("returns Unknown when all resolution paths fail", () => {
    const msg = makeMessage({
      is_inbound: true,
      author: null,
      recipients: [],
    });
    const conv = makeConversation({ recipient: null });
    const result = resolveAuthorName(msg, conv, []);
    expect(result).toBe("Unknown");
  });

  it("returns Unknown for outbound with no author and no from-recipients", () => {
    const msg = makeMessage({
      is_inbound: false,
      author: null,
      recipients: [{ handle: "michael@example.com", role: "to" }],
    });
    const conv = makeConversation();
    const result = resolveAuthorName(msg, conv, []);
    expect(result).toBe("Unknown");
  });

  // --- Colleague matching is case-insensitive ---

  it("matches colleague email case-insensitively", () => {
    const msg = makeMessage({
      author: { handle: "Barbara@PetAirValet.com" }, // different case
    });
    const conv = makeConversation();
    const colleagues = makeColleagueCache([
      { id: "col_1", email: "barbara@petairvalet.com", name: "Barbara" },
    ]);
    const result = resolveAuthorName(msg, conv, colleagues);
    expect(result).toBe("Barbara");
  });
});
