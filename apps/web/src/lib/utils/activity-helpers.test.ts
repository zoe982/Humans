import { describe, it, expect } from "vitest";
import { parseActivityContent, splitEmailSignature } from "./activity-helpers";

describe("parseActivityContent", () => {
  it("returns body as text when body is present", () => {
    const result = parseActivityContent({
      body: "Hello, do you fly to Saudi?",
      notes: "Inbound from Michael\nHello, do you fly to Saudi?",
      direction: "inbound",
    });
    expect(result).toStrictEqual({
      text: "Hello, do you fly to Saudi?",
      direction: "inbound",
      senderName: "Michael",
    });
  });

  it("extracts sender name from notes when body is present", () => {
    const result = parseActivityContent({
      body: "Yes we do fly there.",
      notes: "Outbound from Barbara\nYes we do fly there.",
      direction: "outbound",
    });
    expect(result).toStrictEqual({
      text: "Yes we do fly there.",
      direction: "outbound",
      senderName: "Barbara",
    });
  });

  it("returns null senderName when body exists but notes has no direction prefix", () => {
    const result = parseActivityContent({
      body: "Some message",
      notes: "Just a plain note",
      direction: "inbound",
    });
    expect(result).toStrictEqual({
      text: "Some message",
      direction: "inbound",
      senderName: null,
    });
  });

  it("parses notes when body is null", () => {
    const result = parseActivityContent({
      body: null,
      notes: "Inbound from Michael\nHi there, do you fly to Saudi?",
      direction: "inbound",
    });
    expect(result).toStrictEqual({
      text: "Hi there, do you fly to Saudi?",
      direction: "inbound",
      senderName: "Michael",
    });
  });

  it("infers direction from notes when direction column is null", () => {
    const result = parseActivityContent({
      body: null,
      notes: "Outbound from Barbara\nYes we list in-cabin journeys.",
      direction: null,
    });
    expect(result).toStrictEqual({
      text: "Yes we list in-cabin journeys.",
      direction: "outbound",
      senderName: "Barbara",
    });
  });

  it("prefers direction column over notes-inferred direction", () => {
    const result = parseActivityContent({
      body: null,
      notes: "Inbound from Michael\nSome text",
      direction: "outbound",
    });
    expect(result).toStrictEqual({
      text: "Some text",
      direction: "outbound",
      senderName: "Michael",
    });
  });

  it("returns null senderName when sender is Unknown", () => {
    const result = parseActivityContent({
      body: null,
      notes: "Inbound from Unknown\nSome message",
      direction: "inbound",
    });
    expect(result).toStrictEqual({
      text: "Some message",
      direction: "inbound",
      senderName: null,
    });
  });

  it("handles notes without direction prefix as plain text", () => {
    const result = parseActivityContent({
      body: null,
      notes: "Called to discuss flight options for a pug.",
      direction: null,
    });
    expect(result).toStrictEqual({
      text: "Called to discuss flight options for a pug.",
      direction: null,
      senderName: null,
    });
  });

  it("returns all nulls when both body and notes are null", () => {
    const result = parseActivityContent({
      body: null,
      notes: null,
      direction: null,
    });
    expect(result).toStrictEqual({
      text: null,
      direction: null,
      senderName: null,
    });
  });

  it("returns all nulls when both body and notes are null but direction is set", () => {
    const result = parseActivityContent({
      body: null,
      notes: null,
      direction: "outbound",
    });
    expect(result).toStrictEqual({
      text: null,
      direction: "outbound",
      senderName: null,
    });
  });

  it("handles multiline body content in notes", () => {
    const result = parseActivityContent({
      body: null,
      notes: "Inbound from Michael\nLine one\nLine two\nLine three",
      direction: "inbound",
    });
    expect(result).toStrictEqual({
      text: "Line one\nLine two\nLine three",
      direction: "inbound",
      senderName: "Michael",
    });
  });

  it("handles body present with null notes", () => {
    const result = parseActivityContent({
      body: "Standalone body text",
      notes: null,
      direction: "outbound",
    });
    expect(result).toStrictEqual({
      text: "Standalone body text",
      direction: "outbound",
      senderName: null,
    });
  });
});

describe("splitEmailSignature", () => {
  it("splits on RFC 3676 separator (-- with trailing space)", () => {
    const result = splitEmailSignature("Hello there\n-- \nJohn Doe\nCEO");
    expect(result).toStrictEqual({
      body: "Hello there",
      signature: "-- \nJohn Doe\nCEO",
    });
  });

  it("splits on common double-dash separator", () => {
    const result = splitEmailSignature("Message body\n--\nSignature block");
    expect(result).toStrictEqual({
      body: "Message body",
      signature: "--\nSignature block",
    });
  });

  it("splits on triple-dash separator", () => {
    const result = splitEmailSignature("Some text\n---\nCompany Footer");
    expect(result).toStrictEqual({
      body: "Some text",
      signature: "---\nCompany Footer",
    });
  });

  it("returns null signature when no separator found", () => {
    const result = splitEmailSignature("Just a plain message with no dashes");
    expect(result).toStrictEqual({
      body: "Just a plain message with no dashes",
      signature: null,
    });
  });

  it("handles separator at the very start", () => {
    const result = splitEmailSignature("--\nEntire text is signature");
    expect(result).toStrictEqual({
      body: "",
      signature: "--\nEntire text is signature",
    });
  });

  it("splits at the first separator when multiple exist", () => {
    const result = splitEmailSignature("Body\n--\nSig part 1\n---\nSig part 2");
    expect(result).toStrictEqual({
      body: "Body",
      signature: "--\nSig part 1\n---\nSig part 2",
    });
  });

  it("returns empty body and null signature for empty string", () => {
    const result = splitEmailSignature("");
    expect(result).toStrictEqual({
      body: "",
      signature: null,
    });
  });

  it("does not split on dashes that are not on their own line", () => {
    const result = splitEmailSignature("Use the --verbose flag for details");
    expect(result).toStrictEqual({
      body: "Use the --verbose flag for details",
      signature: null,
    });
  });

  it("handles real-world email with long signature", () => {
    const text = [
      "Hi Michael,",
      "",
      "Yes we can fly your dog from Malta to New York.",
      "",
      "--",
      "Barbara Smith",
      "Pet Air Valet",
      "123 Airport Rd",
      "Confidentiality notice: This email is private.",
    ].join("\n");
    const result = splitEmailSignature(text);
    expect(result.body).toBe(
      "Hi Michael,\n\nYes we can fly your dog from Malta to New York.",
    );
    expect(result.signature).toContain("Barbara Smith");
    expect(result.signature).toContain("Confidentiality notice");
  });
});
