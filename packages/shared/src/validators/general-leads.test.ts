import { describe, it, expect } from "vitest";
import {
  generalLeadStatuses,
  generalLeadSources,
  createGeneralLeadSchema,
  updateGeneralLeadSchema,
  updateGeneralLeadStatusSchema,
  convertGeneralLeadSchema,
} from "./general-leads";

describe("generalLeadStatuses", () => {
  it("contains all expected statuses", () => {
    expect(generalLeadStatuses).toContain("open");
    expect(generalLeadStatuses).toContain("qualified");
    expect(generalLeadStatuses).toContain("closed_converted");
    expect(generalLeadStatuses).toContain("closed_rejected");
  });
});

describe("generalLeadSources", () => {
  it("contains all expected sources", () => {
    expect(generalLeadSources).toContain("whatsapp");
    expect(generalLeadSources).toContain("email");
    expect(generalLeadSources).toContain("direct_referral");
  });
});

describe("createGeneralLeadSchema", () => {
  it("accepts minimal valid input", () => {
    const result = createGeneralLeadSchema.parse({ source: "email" });
    expect(result.source).toBe("email");
  });

  it("accepts all valid sources", () => {
    for (const source of generalLeadSources) {
      expect(createGeneralLeadSchema.parse({ source }).source).toBe(source);
    }
  });

  it("accepts optional notes", () => {
    const result = createGeneralLeadSchema.parse({ source: "whatsapp", notes: "First contact via WhatsApp" });
    expect(result.notes).toBe("First contact via WhatsApp");
  });

  it("accepts optional email", () => {
    const result = createGeneralLeadSchema.parse({ source: "email", email: "lead@example.com" });
    expect(result.email).toBe("lead@example.com");
  });

  it("accepts nullable email", () => {
    const result = createGeneralLeadSchema.parse({ source: "email", email: null });
    expect(result.email).toBeNull();
  });

  it("rejects invalid email format", () => {
    expect(() => createGeneralLeadSchema.parse({ source: "email", email: "not-an-email" })).toThrowError();
  });

  it("accepts optional phone", () => {
    const result = createGeneralLeadSchema.parse({ source: "whatsapp", phone: "+1-555-1234" });
    expect(result.phone).toBe("+1-555-1234");
  });

  it("accepts nullable phone", () => {
    const result = createGeneralLeadSchema.parse({ source: "email", phone: null });
    expect(result.phone).toBeNull();
  });

  it("rejects notes over 10000 chars", () => {
    expect(() => createGeneralLeadSchema.parse({ source: "email", notes: "a".repeat(10001) })).toThrowError();
  });

  it("rejects phone over 50 chars", () => {
    expect(() => createGeneralLeadSchema.parse({ source: "email", phone: "1".repeat(51) })).toThrowError();
  });

  it("accepts optional ownerId", () => {
    const result = createGeneralLeadSchema.parse({ source: "email", ownerId: "col-1" });
    expect(result.ownerId).toBe("col-1");
  });

  it("rejects invalid source", () => {
    expect(() => createGeneralLeadSchema.parse({ source: "invalid" })).toThrowError();
  });

  it("rejects missing source", () => {
    expect(() => createGeneralLeadSchema.parse({})).toThrowError();
  });

  it("rejects phone with script injection", () => {
    expect(() => createGeneralLeadSchema.parse({
      source: "email",
      phone: "<script>alert(1)</script>",
    })).toThrowError();
  });

  it("accepts phone with valid characters", () => {
    const result = createGeneralLeadSchema.parse({
      source: "email",
      phone: "+1 (555) 123-4567",
    });
    expect(result.phone).toBe("+1 (555) 123-4567");
  });
});

describe("updateGeneralLeadSchema", () => {
  it("accepts empty object", () => {
    expect(updateGeneralLeadSchema.parse({})).toStrictEqual({});
  });

  it("accepts notes update", () => {
    const result = updateGeneralLeadSchema.parse({ notes: "Updated notes" });
    expect(result.notes).toBe("Updated notes");
  });

  it("accepts nullable email", () => {
    const result = updateGeneralLeadSchema.parse({ email: null });
    expect(result.email).toBeNull();
  });

  it("rejects invalid email format", () => {
    expect(() => updateGeneralLeadSchema.parse({ email: "not-an-email" })).toThrowError();
  });

  it("accepts nullable phone", () => {
    const result = updateGeneralLeadSchema.parse({ phone: null });
    expect(result.phone).toBeNull();
  });

  it("accepts nullable ownerId", () => {
    const result = updateGeneralLeadSchema.parse({ ownerId: null });
    expect(result.ownerId).toBeNull();
  });

  it("rejects notes over 10000 chars", () => {
    expect(() => updateGeneralLeadSchema.parse({ notes: "a".repeat(10001) })).toThrowError();
  });
});

describe("updateGeneralLeadStatusSchema", () => {
  it("accepts open status without rejectReason", () => {
    const result = updateGeneralLeadStatusSchema.parse({ status: "open" });
    expect(result.status).toBe("open");
  });

  it("accepts qualified status without rejectReason", () => {
    const result = updateGeneralLeadStatusSchema.parse({ status: "qualified" });
    expect(result.status).toBe("qualified");
  });

  it("accepts closed_converted without rejectReason", () => {
    const result = updateGeneralLeadStatusSchema.parse({ status: "closed_converted" });
    expect(result.status).toBe("closed_converted");
  });

  it("rejects closed_rejected without rejectReason", () => {
    expect(() => updateGeneralLeadStatusSchema.parse({ status: "closed_rejected" })).toThrowError();
  });

  it("rejects closed_rejected with empty string rejectReason", () => {
    expect(() =>
      updateGeneralLeadStatusSchema.parse({ status: "closed_rejected", rejectReason: "" })
    ).toThrowError();
  });

  it("rejects closed_rejected with whitespace-only rejectReason", () => {
    expect(() =>
      updateGeneralLeadStatusSchema.parse({ status: "closed_rejected", rejectReason: "   " })
    ).toThrowError();
  });

  it("accepts closed_rejected with valid rejectReason", () => {
    const result = updateGeneralLeadStatusSchema.parse({
      status: "closed_rejected",
      rejectReason: "Client went with a competitor",
    });
    expect(result.status).toBe("closed_rejected");
    expect(result.rejectReason).toBe("Client went with a competitor");
  });

  it("rejects rejectReason over 5000 chars", () => {
    expect(() =>
      updateGeneralLeadStatusSchema.parse({
        status: "closed_rejected",
        rejectReason: "a".repeat(5001),
      })
    ).toThrowError();
  });

  it("rejects invalid status", () => {
    expect(() => updateGeneralLeadStatusSchema.parse({ status: "invalid" })).toThrowError();
  });

  it("rejects missing status", () => {
    expect(() => updateGeneralLeadStatusSchema.parse({})).toThrowError();
  });
});

describe("convertGeneralLeadSchema", () => {
  it("accepts valid humanId", () => {
    const result = convertGeneralLeadSchema.parse({ humanId: "h-1" });
    expect(result.humanId).toBe("h-1");
  });

  it("rejects missing humanId", () => {
    expect(() => convertGeneralLeadSchema.parse({})).toThrowError();
  });
});
