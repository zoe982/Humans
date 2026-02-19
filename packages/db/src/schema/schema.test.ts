import { describe, it, expect } from "vitest";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { colleagues, roles } from "./colleagues";
import { clients, clientStatuses } from "./clients";
import { pets } from "./pets";
import { flights, flightStatuses } from "./flights";
import { flightBookings, bookingStatuses } from "./flight-bookings";
import { leadSources, leadSourceCategories } from "./lead-sources";
import { leadEvents, leadEventTypes } from "./lead-events";
import { auditLog } from "./audit-log";
import { humans, humanStatuses } from "./humans";
import { humanEmails } from "./human-emails";
import { humanTypes, humanTypeValues } from "./human-types";
import { humanRouteSignups } from "./human-route-signups";
import { humanPhoneNumbers } from "./human-phone-numbers";
import { activities, activityTypeValues } from "./activities";
import { geoInterests } from "./geo-interests";
import { geoInterestExpressions } from "./geo-interest-expressions";
import { accounts, accountStatuses } from "./accounts";
import { accountTypesConfig } from "./account-types-config";
import { accountTypes } from "./account-types";
import { accountHumanLabelsConfig } from "./account-human-labels-config";
import { accountHumans } from "./account-humans";
import { accountEmailLabelsConfig } from "./account-email-labels-config";
import { accountEmails } from "./account-emails";
import { accountPhoneLabelsConfig } from "./account-phone-labels-config";
import { accountPhoneNumbers } from "./account-phone-numbers";
import { humanEmailLabelsConfig } from "./human-email-labels-config";
import { humanPhoneLabelsConfig } from "./human-phone-labels-config";
import { errorLog } from "./error-log";

describe("schema tables", () => {
  it("colleagues table has correct name", () => {
    expect(getTableName(colleagues)).toBe("colleagues");
  });

  it("clients table has correct name", () => {
    expect(getTableName(clients)).toBe("clients");
  });

  it("pets table has correct name", () => {
    expect(getTableName(pets)).toBe("pets");
  });

  it("flights table has correct name", () => {
    expect(getTableName(flights)).toBe("flights");
  });

  it("flightBookings table has correct name", () => {
    expect(getTableName(flightBookings)).toBe("flight_bookings");
  });

  it("leadSources table has correct name", () => {
    expect(getTableName(leadSources)).toBe("lead_sources");
  });

  it("leadEvents table has correct name", () => {
    expect(getTableName(leadEvents)).toBe("lead_events");
  });

  it("auditLog table has correct name", () => {
    expect(getTableName(auditLog)).toBe("audit_log");
  });

  it("humans table has correct name", () => {
    expect(getTableName(humans)).toBe("humans");
  });

  it("humanEmails table has correct name", () => {
    expect(getTableName(humanEmails)).toBe("human_emails");
  });

  it("humanTypes table has correct name", () => {
    expect(getTableName(humanTypes)).toBe("human_types");
  });

  it("humanRouteSignups table has correct name", () => {
    expect(getTableName(humanRouteSignups)).toBe("human_route_signups");
  });

  it("humanPhoneNumbers table has correct name", () => {
    expect(getTableName(humanPhoneNumbers)).toBe("human_phone_numbers");
  });

  it("activities table has correct name", () => {
    expect(getTableName(activities)).toBe("activities");
  });

  it("geoInterests table has correct name", () => {
    expect(getTableName(geoInterests)).toBe("geo_interests");
  });

  it("geoInterestExpressions table has correct name", () => {
    expect(getTableName(geoInterestExpressions)).toBe("geo_interest_expressions");
  });

  it("accounts table has correct name", () => {
    expect(getTableName(accounts)).toBe("accounts");
  });

  it("accountTypesConfig table has correct name", () => {
    expect(getTableName(accountTypesConfig)).toBe("account_types_config");
  });

  it("accountTypes table has correct name", () => {
    expect(getTableName(accountTypes)).toBe("account_types");
  });

  it("accountHumanLabelsConfig table has correct name", () => {
    expect(getTableName(accountHumanLabelsConfig)).toBe("account_human_labels_config");
  });

  it("accountHumans table has correct name", () => {
    expect(getTableName(accountHumans)).toBe("account_humans");
  });

  it("accountEmailLabelsConfig table has correct name", () => {
    expect(getTableName(accountEmailLabelsConfig)).toBe("account_email_labels_config");
  });

  it("accountEmails table has correct name", () => {
    expect(getTableName(accountEmails)).toBe("account_emails");
  });

  it("accountPhoneLabelsConfig table has correct name", () => {
    expect(getTableName(accountPhoneLabelsConfig)).toBe("account_phone_labels_config");
  });

  it("accountPhoneNumbers table has correct name", () => {
    expect(getTableName(accountPhoneNumbers)).toBe("account_phone_numbers");
  });

  it("humanEmailLabelsConfig table has correct name", () => {
    expect(getTableName(humanEmailLabelsConfig)).toBe("human_email_labels_config");
  });

  it("humanPhoneLabelsConfig table has correct name", () => {
    expect(getTableName(humanPhoneLabelsConfig)).toBe("human_phone_labels_config");
  });

  it("errorLog table has correct name", () => {
    expect(getTableName(errorLog)).toBe("error_log");
  });

  it("errorLog table has indexes", () => {
    const config = getTableConfig(errorLog);
    expect(config.indexes.length).toBe(3);
  });

  it("geoInterestExpressions table has indexes", () => {
    const config = getTableConfig(geoInterestExpressions);
    expect(config.indexes.length).toBe(2);
  });
});

describe("enum constants", () => {
  it("roles contains expected values", () => {
    expect(roles).toStrictEqual(["admin", "manager", "agent", "viewer"]);
  });

  it("clientStatuses contains expected values", () => {
    expect(clientStatuses).toStrictEqual(["active", "inactive", "prospect"]);
  });

  it("flightStatuses contains expected values", () => {
    expect(flightStatuses).toStrictEqual([
      "scheduled",
      "confirmed",
      "in_transit",
      "completed",
      "cancelled",
    ]);
  });

  it("bookingStatuses contains expected values", () => {
    expect(bookingStatuses).toStrictEqual([
      "pending",
      "confirmed",
      "checked_in",
      "completed",
      "cancelled",
    ]);
  });

  it("leadSourceCategories contains expected values", () => {
    expect(leadSourceCategories).toStrictEqual([
      "paid",
      "organic",
      "referral",
      "direct",
      "event",
    ]);
  });

  it("leadEventTypes contains expected values", () => {
    expect(leadEventTypes).toStrictEqual([
      "inquiry",
      "quote_requested",
      "quote_sent",
      "follow_up",
      "booking",
      "conversion",
      "lost",
    ]);
  });

  it("humanStatuses contains expected values", () => {
    expect(humanStatuses).toStrictEqual(["open", "active", "closed"]);
  });

  it("humanTypeValues contains expected values", () => {
    expect(humanTypeValues).toStrictEqual(["client", "trainer", "travel_agent", "flight_broker"]);
  });

  it("activityTypeValues contains expected values", () => {
    expect(activityTypeValues).toStrictEqual([
      "email",
      "whatsapp_message",
      "online_meeting",
      "phone_call",
    ]);
  });

  it("accountStatuses contains expected values", () => {
    expect(accountStatuses).toStrictEqual(["open", "active", "closed"]);
  });
});

describe("schema index re-exports", () => {
  it("re-exports all tables and constants", async () => {
    const schemaIndex = await import("./index");
    expect(schemaIndex.colleagues).toBeDefined();
    expect(schemaIndex.clients).toBeDefined();
    expect(schemaIndex.pets).toBeDefined();
    expect(schemaIndex.flights).toBeDefined();
    expect(schemaIndex.flightBookings).toBeDefined();
    expect(schemaIndex.leadSources).toBeDefined();
    expect(schemaIndex.leadEvents).toBeDefined();
    expect(schemaIndex.auditLog).toBeDefined();
    expect(schemaIndex.roles).toBeDefined();
    expect(schemaIndex.clientStatuses).toBeDefined();
    expect(schemaIndex.flightStatuses).toBeDefined();
    expect(schemaIndex.bookingStatuses).toBeDefined();
    expect(schemaIndex.leadSourceCategories).toBeDefined();
    expect(schemaIndex.leadEventTypes).toBeDefined();
    expect(schemaIndex.humans).toBeDefined();
    expect(schemaIndex.humanStatuses).toBeDefined();
    expect(schemaIndex.humanEmails).toBeDefined();
    expect(schemaIndex.humanTypes).toBeDefined();
    expect(schemaIndex.humanTypeValues).toBeDefined();
    expect(schemaIndex.humanRouteSignups).toBeDefined();
    expect(schemaIndex.humanPhoneNumbers).toBeDefined();
    expect(schemaIndex.activities).toBeDefined();
    expect(schemaIndex.activityTypeValues).toBeDefined();
    expect(schemaIndex.geoInterests).toBeDefined();
    expect(schemaIndex.geoInterestExpressions).toBeDefined();
    expect(schemaIndex.accounts).toBeDefined();
    expect(schemaIndex.accountStatuses).toBeDefined();
    expect(schemaIndex.accountTypesConfig).toBeDefined();
    expect(schemaIndex.accountTypes).toBeDefined();
    expect(schemaIndex.accountHumanLabelsConfig).toBeDefined();
    expect(schemaIndex.accountHumans).toBeDefined();
    expect(schemaIndex.accountEmailLabelsConfig).toBeDefined();
    expect(schemaIndex.accountEmails).toBeDefined();
    expect(schemaIndex.accountPhoneLabelsConfig).toBeDefined();
    expect(schemaIndex.accountPhoneNumbers).toBeDefined();
    expect(schemaIndex.humanEmailLabelsConfig).toBeDefined();
    expect(schemaIndex.humanPhoneLabelsConfig).toBeDefined();
    expect(schemaIndex.errorLog).toBeDefined();
  });
});
