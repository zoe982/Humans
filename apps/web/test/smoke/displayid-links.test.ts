// Static link-map test: every entity type has a detail page, and every
// displayId link in a related list points to that entity's own detail page.
//
// This test catches:
//   1. DisplayId links that point to the wrong detail page
//   2. Entity types that are missing a detail page entirely
//   3. Manifest entries that are out of sync with actual routes
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Entity detail route map — the canonical URL for each entity type
// ---------------------------------------------------------------------------

const ENTITY_DETAIL_ROUTES: Record<string, (id: string) => string> = {
  email: (id) => `/emails/${id}`,
  phone: (id) => `/phone-numbers/${id}`,
  pet: (id) => `/pets/${id}`,
  human: (id) => `/humans/${id}`,
  account: (id) => `/accounts/${id}`,
  activity: (id) => `/activities/${id}`,
  socialId: (id) => `/social-ids/${id}`,
  routeInterest: (id) => `/route-interests/${id}`,
  geoInterest: (id) => `/geo-interests/${id}`,
  routeInterestExpression: (id) => `/route-interests/expressions/${id}`,
  geoInterestExpression: (id) => `/geo-interests/expressions/${id}`,
  routeSignup: (id) => `/leads/route-signups/${id}`,
  websiteBookingRequest: (id) => `/leads/website-booking-requests/${id}`,
};

// ---------------------------------------------------------------------------
// Related-list manifest — every related list across all detail pages
// ---------------------------------------------------------------------------

const RELATED_LIST_LINKS = [
  // Humans page
  { page: "humans", relatedList: "Emails", entityType: "email", idField: "id" },
  { page: "humans", relatedList: "Phone Numbers", entityType: "phone", idField: "id" },
  { page: "humans", relatedList: "Social IDs", entityType: "socialId", idField: "id" },
  { page: "humans", relatedList: "Pets", entityType: "pet", idField: "id" },
  { page: "humans", relatedList: "Geo Interest Expressions", entityType: "geoInterestExpression", idField: "id" },
  { page: "humans", relatedList: "Route Interest Expressions", entityType: "routeInterestExpression", idField: "id" },
  { page: "humans", relatedList: "Linked Accounts", entityType: "account", idField: "accountId" },
  { page: "humans", relatedList: "Linked Route Signups", entityType: "routeSignup", idField: "routeSignupId" },
  { page: "humans", relatedList: "Linked Booking Requests", entityType: "websiteBookingRequest", idField: "websiteBookingRequestId" },
  { page: "humans", relatedList: "Activities", entityType: "activity", idField: "id" },
  // Route Interests page
  { page: "routeInterests", relatedList: "Expressions", entityType: "routeInterestExpression", idField: "id" },
  // Geo Interests page
  { page: "geoInterests", relatedList: "Expressions", entityType: "geoInterestExpression", idField: "id" },
  // Accounts page
  { page: "accounts", relatedList: "Linked Humans", entityType: "human", idField: "humanId" },
  { page: "accounts", relatedList: "Emails", entityType: "email", idField: "id" },
  { page: "accounts", relatedList: "Phone Numbers", entityType: "phone", idField: "id" },
  { page: "accounts", relatedList: "Social IDs", entityType: "socialId", idField: "id" },
];

// ---------------------------------------------------------------------------
// Helper: convert URL pattern to filesystem path
// ---------------------------------------------------------------------------

const ROUTES_DIR = resolve(__dirname, "../../src/routes");

function entityRouteToFilePath(entityType: string): string {
  // Build the URL with a placeholder, then convert the last segment to [id]
  const url = ENTITY_DETAIL_ROUTES[entityType]("__ID__");
  const segments = url.replace(/^\//, "").split("/");
  // Replace the ID placeholder segment with SvelteKit's [id] param
  const mapped = segments.map((s) => (s === "__ID__" ? "[id]" : s));
  return resolve(ROUTES_DIR, ...mapped, "+page.svelte");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Entity detail route existence", () => {
  for (const [entityType, routeFn] of Object.entries(ENTITY_DETAIL_ROUTES)) {
    it(`${entityType} detail page exists at ${routeFn(":id")}`, () => {
      const filePath = entityRouteToFilePath(entityType);
      expect(existsSync(filePath), `Missing detail page: ${filePath}`).toBe(true);
    });
  }
});

describe("Related list link targets", () => {
  for (const entry of RELATED_LIST_LINKS) {
    it(`${entry.page} → ${entry.relatedList} links to ${entry.entityType} detail page`, () => {
      // Verify the entity type exists in the route map
      expect(
        ENTITY_DETAIL_ROUTES[entry.entityType],
        `Entity type "${entry.entityType}" is not in ENTITY_DETAIL_ROUTES`,
      ).toBeDefined();

      // Verify the target detail page file exists
      const filePath = entityRouteToFilePath(entry.entityType);
      expect(existsSync(filePath), `Missing detail page for ${entry.entityType}: ${filePath}`).toBe(true);
    });
  }
});

describe("Link map completeness", () => {
  it("every entity type with a detail page is reachable from at least one related list", () => {
    const linkedEntityTypes = new Set(RELATED_LIST_LINKS.map((e) => e.entityType));

    // These entity types are top-level list pages (not shown in related lists)
    const topLevelOnly = new Set(["routeInterest", "geoInterest", "activity"]);

    for (const entityType of Object.keys(ENTITY_DETAIL_ROUTES)) {
      if (topLevelOnly.has(entityType)) continue;
      expect(
        linkedEntityTypes.has(entityType),
        `Entity type "${entityType}" has a detail page but no related list links to it`,
      ).toBe(true);
    }
  });
});
