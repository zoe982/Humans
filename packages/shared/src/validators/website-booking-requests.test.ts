import { describe, it, expect } from "vitest";
import {
  websiteBookingRequestStatuses,
  updateWebsiteBookingRequestSchema,
} from "./website-booking-requests";

describe("websiteBookingRequestStatuses", () => {
  it("includes all pipeline statuses", () => {
    expect(websiteBookingRequestStatuses).toContain("open");
    expect(websiteBookingRequestStatuses).toContain("pending_response");
    expect(websiteBookingRequestStatuses).toContain("qualified");
    expect(websiteBookingRequestStatuses).toContain("deposit_requested");
    expect(websiteBookingRequestStatuses).toContain("deposit_received");
    expect(websiteBookingRequestStatuses).toContain("group_forming");
    expect(websiteBookingRequestStatuses).toContain("flight_confirmed");
    expect(websiteBookingRequestStatuses).toContain("final_payment_requested");
    expect(websiteBookingRequestStatuses).toContain("paid");
    expect(websiteBookingRequestStatuses).toContain("docs_in_progress");
    expect(websiteBookingRequestStatuses).toContain("docs_complete");
    expect(websiteBookingRequestStatuses).toContain("closed_flown");
    expect(websiteBookingRequestStatuses).toContain("closed_lost");
  });
});

describe("updateWebsiteBookingRequestSchema", () => {
  it("accepts valid pipeline statuses", () => {
    const result = updateWebsiteBookingRequestSchema.parse({ status: "qualified" });
    expect(result.status).toBe("qualified");
  });

  it("accepts closed_flown status", () => {
    const result = updateWebsiteBookingRequestSchema.parse({ status: "closed_flown" });
    expect(result.status).toBe("closed_flown");
  });

  it("rejects invalid status", () => {
    expect(() => updateWebsiteBookingRequestSchema.parse({ status: "invalid_status" })).toThrowError();
  });

  it("accepts crm_loss_reason string", () => {
    const result = updateWebsiteBookingRequestSchema.parse({ crm_loss_reason: "Price/Budget" });
    expect(result.crm_loss_reason).toBe("Price/Budget");
  });

  it("accepts nullable crm_loss_reason", () => {
    const result = updateWebsiteBookingRequestSchema.parse({ crm_loss_reason: null });
    expect(result.crm_loss_reason).toBeNull();
  });

  it("rejects crm_loss_reason over 255 chars", () => {
    expect(() => updateWebsiteBookingRequestSchema.parse({ crm_loss_reason: "a".repeat(256) })).toThrowError();
  });

  it("accepts crm_loss_notes string", () => {
    const result = updateWebsiteBookingRequestSchema.parse({ crm_loss_notes: "Client chose cheaper option" });
    expect(result.crm_loss_notes).toBe("Client chose cheaper option");
  });

  it("accepts nullable crm_loss_notes", () => {
    const result = updateWebsiteBookingRequestSchema.parse({ crm_loss_notes: null });
    expect(result.crm_loss_notes).toBeNull();
  });

  it("rejects crm_loss_notes over 5000 chars", () => {
    expect(() => updateWebsiteBookingRequestSchema.parse({ crm_loss_notes: "a".repeat(5001) })).toThrowError();
  });
});
