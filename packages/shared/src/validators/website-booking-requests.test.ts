import { describe, it, expect } from "vitest";
import {
  websiteBookingRequestStatuses,
  updateWebsiteBookingRequestSchema,
} from "./website-booking-requests";

describe("websiteBookingRequestStatuses", () => {
  it("includes closed_converted", () => {
    expect(websiteBookingRequestStatuses).toContain("closed_converted");
  });
});

describe("updateWebsiteBookingRequestSchema", () => {
  it("accepts closed_converted status", () => {
    const result = updateWebsiteBookingRequestSchema.parse({ status: "closed_converted" });
    expect(result.status).toBe("closed_converted");
  });
});
