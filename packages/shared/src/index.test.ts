import { describe, it, expect } from "vitest";
import * as shared from "./index";

describe("shared/index re-exports", () => {
  it("re-exports validators", () => {
    expect(shared.createHumanSchema).toBeDefined();
    expect(shared.createPetSchema).toBeDefined();
    expect(shared.createFlightSchema).toBeDefined();
    expect(shared.createBookingSchema).toBeDefined();
    expect(shared.createActivitySchema).toBeDefined();
    expect(shared.createAccountSchema).toBeDefined();
    expect(shared.createEmailSchema).toBeDefined();
    expect(shared.createPhoneNumberSchema).toBeDefined();
    expect(shared.createGeoInterestSchema).toBeDefined();
    expect(shared.searchQuerySchema).toBeDefined();
  });

  it("re-exports constants", () => {
    expect(shared.ROLES).toBeDefined();
    expect(shared.ROLE_HIERARCHY).toBeDefined();
    expect(shared.PERMISSIONS).toBeDefined();
    expect(shared.PET_BREEDS).toBeDefined();
    expect(shared.SESSION_COOKIE_NAME).toBeDefined();
  });

  it("re-exports countries", () => {
    expect(shared.COUNTRIES).toBeDefined();
    expect(Array.isArray(shared.COUNTRIES)).toBe(true);
  });

  it("re-exports country phone codes", () => {
    expect(shared.COUNTRY_PHONE_CODES).toBeDefined();
    expect(Array.isArray(shared.COUNTRY_PHONE_CODES)).toBe(true);
  });

  it("re-exports error codes", () => {
    expect(shared.ERROR_CODES).toBeDefined();
    expect(shared.ERROR_CODES.AUTH_REQUIRED).toBe("AUTH_REQUIRED");
  });
});
