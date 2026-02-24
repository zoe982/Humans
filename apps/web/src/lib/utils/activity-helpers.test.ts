import { describe, it, expect } from "vitest";
import { parseActivityContent } from "./activity-helpers";

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
