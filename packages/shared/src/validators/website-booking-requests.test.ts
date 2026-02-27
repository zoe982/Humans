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
});
