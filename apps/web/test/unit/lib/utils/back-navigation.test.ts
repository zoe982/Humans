import { describe, it, expect } from "vitest";
import { entityLabelFromPath, isValidFromPath } from "../../../../src/lib/utils/back-navigation";

describe("entityLabelFromPath", () => {
  describe("single-segment entity paths", () => {
    it("returns 'Account' for /accounts/:id", () => {
      expect(entityLabelFromPath("/accounts/abc123")).toBe("Account");
    });

    it("returns 'Human' for /humans/:id", () => {
      expect(entityLabelFromPath("/humans/h1")).toBe("Human");
    });

    it("returns 'Agreement' for /agreements/:id", () => {
      expect(entityLabelFromPath("/agreements/agr-1")).toBe("Agreement");
    });

    it("returns 'Activity' for /activities/:id", () => {
      expect(entityLabelFromPath("/activities/act-1")).toBe("Activity");
    });

    it("returns 'Discount Code' for /discount-codes/:id", () => {
      expect(entityLabelFromPath("/discount-codes/dc-1")).toBe("Discount Code");
    });

    it("returns 'Email' for /emails/:id", () => {
      expect(entityLabelFromPath("/emails/eml-1")).toBe("Email");
    });

    it("returns 'Flight' for /flights/:id", () => {
      expect(entityLabelFromPath("/flights/fly-1")).toBe("Flight");
    });

    it("returns 'Geo Interest' for /geo-interests/:id", () => {
      expect(entityLabelFromPath("/geo-interests/geo-1")).toBe("Geo Interest");
    });

    it("returns 'Opportunity' for /opportunities/:id", () => {
      expect(entityLabelFromPath("/opportunities/opp-1")).toBe("Opportunity");
    });

    it("returns 'Pet' for /pets/:id", () => {
      expect(entityLabelFromPath("/pets/pet-1")).toBe("Pet");
    });

    it("returns 'Phone Number' for /phone-numbers/:id", () => {
      expect(entityLabelFromPath("/phone-numbers/fon-1")).toBe("Phone Number");
    });

    it("returns 'Referral Code' for /referral-codes/:id", () => {
      expect(entityLabelFromPath("/referral-codes/ref-1")).toBe("Referral Code");
    });

    it("returns 'Route Interest' for /route-interests/:id", () => {
      expect(entityLabelFromPath("/route-interests/roi-1")).toBe("Route Interest");
    });

    it("returns 'Social ID' for /social-ids/:id", () => {
      expect(entityLabelFromPath("/social-ids/soc-1")).toBe("Social ID");
    });

    it("returns 'Website' for /websites/:id", () => {
      expect(entityLabelFromPath("/websites/web-1")).toBe("Website");
    });
  });

  describe("two-segment entity paths", () => {
    it("returns 'General Lead' for /leads/general-leads/:id", () => {
      expect(entityLabelFromPath("/leads/general-leads/lea-1")).toBe("General Lead");
    });

    it("returns 'Route Signup' for /leads/route-signups/:id", () => {
      expect(entityLabelFromPath("/leads/route-signups/roi-1")).toBe("Route Signup");
    });

    it("returns 'Booking Request' for /leads/website-booking-requests/:id", () => {
      expect(entityLabelFromPath("/leads/website-booking-requests/bor-1")).toBe("Booking Request");
    });

    it("returns 'Error Log' for /admin/error-log/:id", () => {
      expect(entityLabelFromPath("/admin/error-log/err-1")).toBe("Error Log");
    });

    it("returns 'Geo Expression' for /geo-interests/expressions/:id", () => {
      expect(entityLabelFromPath("/geo-interests/expressions/gex-1")).toBe("Geo Expression");
    });

    it("returns 'Route Expression' for /route-interests/expressions/:id", () => {
      expect(entityLabelFromPath("/route-interests/expressions/rex-1")).toBe("Route Expression");
    });
  });

  describe("unknown paths", () => {
    it("returns null for a completely unknown first segment", () => {
      expect(entityLabelFromPath("/unknown/id")).toBeNull();
    });

    it("returns null for /admin/:id when 'admin' has no standalone label", () => {
      expect(entityLabelFromPath("/admin/some-id")).toBeNull();
    });

    it("returns null for an unknown two-segment prefix", () => {
      expect(entityLabelFromPath("/leads/unknown-type/id")).toBeNull();
    });

    it("returns null for an empty string", () => {
      expect(entityLabelFromPath("")).toBeNull();
    });

    it("returns null for a bare slash", () => {
      expect(entityLabelFromPath("/")).toBeNull();
    });
  });

  describe("paths with only one segment (no ID)", () => {
    it("returns null for /accounts with no ID segment", () => {
      expect(entityLabelFromPath("/accounts")).toBeNull();
    });

    it("returns null for /humans with no ID segment", () => {
      expect(entityLabelFromPath("/humans")).toBeNull();
    });

    it("returns null for /leads/general-leads with no ID segment", () => {
      // Two segments but needs three (prefix0/prefix1/id) — falls to single-segment
      // lookup where 'leads' has no standalone label either.
      expect(entityLabelFromPath("/leads/general-leads")).toBeNull();
    });
  });
});

describe("isValidFromPath", () => {
  describe("valid entity detail paths", () => {
    it("returns true for /accounts/:id", () => {
      expect(isValidFromPath("/accounts/abc123")).toBe(true);
    });

    it("returns true for /humans/:id", () => {
      expect(isValidFromPath("/humans/h1")).toBe(true);
    });

    it("returns true for /leads/general-leads/:id", () => {
      expect(isValidFromPath("/leads/general-leads/lea-1")).toBe(true);
    });

    it("returns true for /leads/route-signups/:id", () => {
      expect(isValidFromPath("/leads/route-signups/roi-1")).toBe(true);
    });

    it("returns true for /leads/website-booking-requests/:id", () => {
      expect(isValidFromPath("/leads/website-booking-requests/bor-1")).toBe(true);
    });

    it("returns true for /geo-interests/expressions/:id", () => {
      expect(isValidFromPath("/geo-interests/expressions/gex-1")).toBe(true);
    });

    it("returns true for /route-interests/expressions/:id", () => {
      expect(isValidFromPath("/route-interests/expressions/rex-1")).toBe(true);
    });

    it("returns true for /admin/error-log/:id", () => {
      expect(isValidFromPath("/admin/error-log/err-1")).toBe(true);
    });

    it("returns true for /flights/:id", () => {
      expect(isValidFromPath("/flights/fly-1")).toBe(true);
    });

    it("returns true for /pets/:id", () => {
      expect(isValidFromPath("/pets/pet-1")).toBe(true);
    });
  });

  describe("paths not starting with /", () => {
    it("returns false for a path without a leading slash", () => {
      expect(isValidFromPath("accounts/abc123")).toBe(false);
    });

    it("returns false for an absolute HTTP URL", () => {
      expect(isValidFromPath("http://evil.com/accounts/id")).toBe(false);
    });

    it("returns false for an empty string", () => {
      expect(isValidFromPath("")).toBe(false);
    });
  });

  describe("paths starting with //", () => {
    it("returns false for //evil.com/accounts/id (protocol-relative open redirect)", () => {
      expect(isValidFromPath("//evil.com/accounts/id")).toBe(false);
    });

    it("returns false for //accounts/id", () => {
      expect(isValidFromPath("//accounts/id")).toBe(false);
    });
  });

  describe("unknown entity paths", () => {
    it("returns false for /unknown/id", () => {
      expect(isValidFromPath("/unknown/id")).toBe(false);
    });

    it("returns false for /admin/id (admin has no standalone detail route)", () => {
      expect(isValidFromPath("/admin/id")).toBe(false);
    });

    it("returns false for /leads/unknown-type/id", () => {
      expect(isValidFromPath("/leads/unknown-type/id")).toBe(false);
    });
  });

  describe("list paths without an ID", () => {
    it("returns false for /accounts (list, no ID)", () => {
      expect(isValidFromPath("/accounts")).toBe(false);
    });

    it("returns false for /humans (list, no ID)", () => {
      expect(isValidFromPath("/humans")).toBe(false);
    });

    it("returns false for /leads/general-leads (two-segment list, no ID)", () => {
      expect(isValidFromPath("/leads/general-leads")).toBe(false);
    });

    it("returns false for a bare slash", () => {
      expect(isValidFromPath("/")).toBe(false);
    });
  });

  describe("paths with extra nesting", () => {
    it("returns false for /accounts/id/sub-resource (too many segments)", () => {
      expect(isValidFromPath("/accounts/abc123/emails")).toBe(false);
    });

    it("returns false for /geo-interests/expressions/id/sub-resource", () => {
      expect(isValidFromPath("/geo-interests/expressions/gex-1/detail")).toBe(false);
    });
  });
});
