import { describe, it, expect } from "vitest";
import {
  generalLeadStatuses,
  createGeneralLeadSchema,
  updateGeneralLeadSchema,
  updateGeneralLeadStatusSchema,
  convertGeneralLeadSchema,
  importFromFrontSchema,
} from "./general-leads";

describe("generalLeadStatuses", () => {
  it("contains all expected statuses", () => {
    expect(generalLeadStatuses).toContain("open");
    expect(generalLeadStatuses).toContain("qualified");
    expect(generalLeadStatuses).toContain("closed_converted");
    expect(generalLeadStatuses).toContain("closed_rejected");
  });

  it("contains closed_no_response status", () => {
    expect(generalLeadStatuses).toContain("closed_no_response");
  });
});

describe("createGeneralLeadSchema", () => {
  it("accepts minimal valid input", () => {
    const result = createGeneralLeadSchema.parse({ firstName: "John", lastName: "Doe" });
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Doe");
  });

  it("accepts all name fields", () => {
    const result = createGeneralLeadSchema.parse({
      firstName: "John",
      middleName: "Michael",
      lastName: "Doe",
    });
    expect(result.firstName).toBe("John");
    expect(result.middleName).toBe("Michael");
    expect(result.lastName).toBe("Doe");
  });

  it("accepts optional notes", () => {
    const result = createGeneralLeadSchema.parse({ firstName: "Jane", lastName: "Lead", notes: "First contact via WhatsApp" });
    expect(result.notes).toBe("First contact via WhatsApp");
  });

  it("accepts optional ownerId", () => {
    const result = createGeneralLeadSchema.parse({ firstName: "Jane", lastName: "Lead", ownerId: "col-1" });
    expect(result.ownerId).toBe("col-1");
  });

  it("rejects missing firstName", () => {
    expect(() => createGeneralLeadSchema.parse({ lastName: "Doe" })).toThrowError();
  });

  it("rejects missing lastName", () => {
    expect(() => createGeneralLeadSchema.parse({ firstName: "John" })).toThrowError();
  });

  it("rejects empty firstName", () => {
    expect(() => createGeneralLeadSchema.parse({ firstName: "", lastName: "Doe" })).toThrowError();
  });

  it("rejects empty lastName", () => {
    expect(() => createGeneralLeadSchema.parse({ firstName: "John", lastName: "" })).toThrowError();
  });

  it("rejects firstName over 255 chars", () => {
    expect(() => createGeneralLeadSchema.parse({ firstName: "a".repeat(256), lastName: "Doe" })).toThrowError();
  });

  it("rejects lastName over 255 chars", () => {
    expect(() => createGeneralLeadSchema.parse({ firstName: "John", lastName: "a".repeat(256) })).toThrowError();
  });

  it("rejects middleName over 255 chars", () => {
    expect(() => createGeneralLeadSchema.parse({ firstName: "John", middleName: "a".repeat(256), lastName: "Doe" })).toThrowError();
  });

  it("rejects notes over 10000 chars", () => {
    expect(() => createGeneralLeadSchema.parse({ firstName: "John", lastName: "Doe", notes: "a".repeat(10001) })).toThrowError();
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

  it("accepts firstName update", () => {
    const result = updateGeneralLeadSchema.parse({ firstName: "Jane" });
    expect(result.firstName).toBe("Jane");
  });

  it("accepts middleName update", () => {
    const result = updateGeneralLeadSchema.parse({ middleName: "Marie" });
    expect(result.middleName).toBe("Marie");
  });

  it("accepts nullable middleName", () => {
    const result = updateGeneralLeadSchema.parse({ middleName: null });
    expect(result.middleName).toBeNull();
  });

  it("accepts lastName update", () => {
    const result = updateGeneralLeadSchema.parse({ lastName: "Smith" });
    expect(result.lastName).toBe("Smith");
  });

  it("accepts nullable ownerId", () => {
    const result = updateGeneralLeadSchema.parse({ ownerId: null });
    expect(result.ownerId).toBeNull();
  });

  it("rejects notes over 10000 chars", () => {
    expect(() => updateGeneralLeadSchema.parse({ notes: "a".repeat(10001) })).toThrowError();
  });

  it("rejects firstName over 255 chars", () => {
    expect(() => updateGeneralLeadSchema.parse({ firstName: "a".repeat(256) })).toThrowError();
  });

  it("rejects empty firstName when provided", () => {
    expect(() => updateGeneralLeadSchema.parse({ firstName: "" })).toThrowError();
  });

  it("rejects empty lastName when provided", () => {
    expect(() => updateGeneralLeadSchema.parse({ lastName: "" })).toThrowError();
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

  it("accepts lossReason with closed_rejected status", () => {
    const result = updateGeneralLeadStatusSchema.parse({
      status: "closed_rejected",
      rejectReason: "Not interested",
      lossReason: "Price/Budget",
    });
    expect(result.lossReason).toBe("Price/Budget");
  });

  it("accepts closed_rejected without lossReason (optional)", () => {
    const result = updateGeneralLeadStatusSchema.parse({
      status: "closed_rejected",
      rejectReason: "Not interested",
    });
    expect(result.status).toBe("closed_rejected");
  });

  it("accepts closed_no_response with lossReason", () => {
    const result = updateGeneralLeadStatusSchema.parse({
      status: "closed_no_response",
      lossReason: "No Response",
    });
    expect(result.lossReason).toBe("No Response");
  });

  it("rejects lossReason over 255 chars", () => {
    expect(() => updateGeneralLeadStatusSchema.parse({
      status: "closed_rejected",
      rejectReason: "reason",
      lossReason: "a".repeat(256),
    })).toThrowError();
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

describe("importFromFrontSchema", () => {
  it("accepts a valid message ID", () => {
    const result = importFromFrontSchema.parse({ frontId: "msg_abc123" });
    expect(result.frontId).toBe("msg_abc123");
  });

  it("accepts a valid conversation ID", () => {
    const result = importFromFrontSchema.parse({ frontId: "cnv_xyz789" });
    expect(result.frontId).toBe("cnv_xyz789");
  });

  it("rejects empty string", () => {
    expect(() => importFromFrontSchema.parse({ frontId: "" })).toThrowError();
  });

  it("rejects missing frontId", () => {
    expect(() => importFromFrontSchema.parse({})).toThrowError();
  });

  it("rejects frontId over 100 chars", () => {
    expect(() => importFromFrontSchema.parse({ frontId: "a".repeat(101) })).toThrowError();
  });
});
