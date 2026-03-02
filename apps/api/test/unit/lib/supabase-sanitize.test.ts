import { describe, it, expect } from "vitest";
import { sanitizePostgrestValue } from "../../../src/lib/supabase-sanitize";

describe("sanitizePostgrestValue", () => {
  it("passes through clean alphanumeric strings", () => {
    expect(sanitizePostgrestValue("hello")).toBe("hello");
    expect(sanitizePostgrestValue("John Doe")).toBe("John Doe");
    expect(sanitizePostgrestValue("test123")).toBe("test123");
  });

  it("strips commas (PostgREST filter separator)", () => {
    expect(sanitizePostgrestValue("a,b")).toBe("ab");
  });

  it("strips dots (PostgREST field separator)", () => {
    expect(sanitizePostgrestValue("a.b")).toBe("ab");
  });

  it("strips parentheses (PostgREST grouping)", () => {
    expect(sanitizePostgrestValue("a(b)")).toBe("ab");
  });

  it("strips double quotes (PostgREST value quoting)", () => {
    expect(sanitizePostgrestValue('a"b')).toBe("ab");
  });

  it("strips backslashes (escape character)", () => {
    expect(sanitizePostgrestValue("a\\b")).toBe("ab");
  });

  it("strips all special characters from a crafted injection", () => {
    expect(sanitizePostgrestValue('name.eq."admin",role.eq."superuser"')).toBe("nameeqadminroleeqsuperuser");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizePostgrestValue("")).toBe("");
  });

  it("preserves spaces, hyphens, and unicode characters", () => {
    expect(sanitizePostgrestValue("Jean-Pierre Müller")).toBe("Jean-Pierre Müller");
  });

  it("preserves @ and + signs (common in emails/phones)", () => {
    expect(sanitizePostgrestValue("user@example")).toBe("user@example");
    expect(sanitizePostgrestValue("+1234")).toBe("+1234");
  });

  it("strips percent signs (URL encoding injection)", () => {
    expect(sanitizePostgrestValue("100%")).toBe("100");
    expect(sanitizePostgrestValue("%25admin")).toBe("25admin");
  });

  it("strips asterisks (PostgREST wildcard operator)", () => {
    expect(sanitizePostgrestValue("admin*")).toBe("admin");
    expect(sanitizePostgrestValue("*")).toBe("");
  });

  it("strips colons (PostgREST range/cast operator)", () => {
    expect(sanitizePostgrestValue("field:type")).toBe("fieldtype");
  });

  it("strips semicolons (statement separator)", () => {
    expect(sanitizePostgrestValue("value;DROP")).toBe("valueDROP");
  });

  it("strips curly braces (PostgREST array literals)", () => {
    expect(sanitizePostgrestValue("{1,2,3}")).toBe("123");
  });

  it("strips square brackets (PostgREST JSON path)", () => {
    expect(sanitizePostgrestValue("data[0]")).toBe("data0");
  });
});
