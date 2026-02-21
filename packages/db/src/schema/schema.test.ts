import { describe, it, expect } from "vitest";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { colleagues, roles } from "./colleagues";
import { pets } from "./pets";
import { leadSources, leadSourceCategories } from "./lead-sources";
import { leadEvents, leadEventTypes } from "./lead-events";
import { auditLog } from "./audit-log";
import { humans, humanStatuses } from "./humans";
import { emails, emailOwnerTypes } from "./emails";
import { emailLabelsConfig } from "./email-labels-config";
import { humanTypes, humanTypeValues } from "./human-types";
import { humanRouteSignups } from "./human-route-signups";
import { phones, phoneOwnerTypes } from "./phones";
import { phoneLabelsConfig } from "./phone-labels-config";
import { activities, activityTypeValues } from "./activities";
import { geoInterests } from "./geo-interests";
import { geoInterestExpressions } from "./geo-interest-expressions";
import { accounts, accountStatuses } from "./accounts";
import { accountTypesConfig } from "./account-types-config";
import { accountTypes } from "./account-types";
import { accountHumanLabelsConfig } from "./account-human-labels-config";
import { accountHumans } from "./account-humans";
import { displayIdCounters } from "./display-id-counters";
import { errorLog, errorLogResolutionStatuses } from "./error-log";
import { routeInterests } from "./route-interests";
import {
  routeInterestExpressions,
  routeInterestFrequencyValues,
} from "./route-interest-expressions";
import { socialIds } from "./social-ids";

describe("schema tables", () => {
  it("colleagues table has correct name", () => {
    expect(getTableName(colleagues)).toBe("colleagues");
  });

  it("pets table has correct name", () => {
    expect(getTableName(pets)).toBe("pets");
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

  it("emails table has correct name", () => {
    expect(getTableName(emails)).toBe("emails");
  });

  it("emailLabelsConfig table has correct name", () => {
    expect(getTableName(emailLabelsConfig)).toBe("email_labels_config");
  });

  it("humanTypes table has correct name", () => {
    expect(getTableName(humanTypes)).toBe("human_types");
  });

  it("humanRouteSignups table has correct name", () => {
    expect(getTableName(humanRouteSignups)).toBe("human_route_signups");
  });

  it("phones table has correct name", () => {
    expect(getTableName(phones)).toBe("phones");
  });

  it("phoneLabelsConfig table has correct name", () => {
    expect(getTableName(phoneLabelsConfig)).toBe("phone_labels_config");
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

  it("displayIdCounters table has correct name", () => {
    expect(getTableName(displayIdCounters)).toBe("display_id_counters");
  });

  it("errorLog table has correct name", () => {
    expect(getTableName(errorLog)).toBe("error_log");
  });

  it("errorLog table has indexes", () => {
    const config = getTableConfig(errorLog);
    expect(config.indexes.length).toBe(5);
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
      "social_message",
    ]);
  });

  it("accountStatuses contains expected values", () => {
    expect(accountStatuses).toStrictEqual(["open", "active", "closed"]);
  });
});

describe("table indexes", () => {
  it("emails table has indexes", () => {
    const config = getTableConfig(emails);
    expect(config.indexes.length).toBeGreaterThanOrEqual(1);
  });

  it("phones table has indexes", () => {
    const config = getTableConfig(phones);
    expect(config.indexes.length).toBeGreaterThanOrEqual(1);
  });

  it("routeInterests table has indexes", () => {
    const config = getTableConfig(routeInterests);
    expect(config.indexes.length).toBeGreaterThanOrEqual(1);
  });

  it("routeInterestExpressions table has indexes", () => {
    const config = getTableConfig(routeInterestExpressions);
    expect(config.indexes.length).toBeGreaterThanOrEqual(2);
  });

  it("socialIds table has indexes", () => {
    const config = getTableConfig(socialIds);
    expect(config.indexes.length).toBeGreaterThanOrEqual(2);
  });
});

describe("additional table names", () => {
  it("routeInterests table has correct name", () => {
    expect(getTableName(routeInterests)).toBe("route_interests");
  });

  it("routeInterestExpressions table has correct name", () => {
    expect(getTableName(routeInterestExpressions)).toBe("route_interest_expressions");
  });

  it("socialIds table has correct name", () => {
    expect(getTableName(socialIds)).toBe("social_ids");
  });
});

describe("additional enum constants", () => {
  it("emailOwnerTypes contains expected values", () => {
    expect(emailOwnerTypes).toStrictEqual(["human", "account"]);
  });

  it("phoneOwnerTypes contains expected values", () => {
    expect(phoneOwnerTypes).toStrictEqual(["human", "account"]);
  });

  it("routeInterestFrequencyValues contains expected values", () => {
    expect(routeInterestFrequencyValues).toStrictEqual(["one_time", "repeat"]);
  });

  it("errorLogResolutionStatuses contains expected values", () => {
    expect(errorLogResolutionStatuses).toStrictEqual(["open", "resolved"]);
  });
});

describe("schema index re-exports", () => {
  it("re-exports all tables and constants", async () => {
    const schemaIndex = await import("./index");
    expect(schemaIndex.colleagues).toBeDefined();
    expect(schemaIndex.pets).toBeDefined();
    expect(schemaIndex.leadSources).toBeDefined();
    expect(schemaIndex.leadEvents).toBeDefined();
    expect(schemaIndex.auditLog).toBeDefined();
    expect(schemaIndex.roles).toBeDefined();
    expect(schemaIndex.leadSourceCategories).toBeDefined();
    expect(schemaIndex.leadEventTypes).toBeDefined();
    expect(schemaIndex.humans).toBeDefined();
    expect(schemaIndex.humanStatuses).toBeDefined();
    expect(schemaIndex.emails).toBeDefined();
    expect(schemaIndex.emailLabelsConfig).toBeDefined();
    expect(schemaIndex.humanTypes).toBeDefined();
    expect(schemaIndex.humanTypeValues).toBeDefined();
    expect(schemaIndex.humanRouteSignups).toBeDefined();
    expect(schemaIndex.phones).toBeDefined();
    expect(schemaIndex.phoneLabelsConfig).toBeDefined();
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
    expect(schemaIndex.displayIdCounters).toBeDefined();
    expect(schemaIndex.errorLog).toBeDefined();
    expect(schemaIndex.routeInterests).toBeDefined();
    expect(schemaIndex.routeInterestExpressions).toBeDefined();
    expect(schemaIndex.routeInterestFrequencyValues).toBeDefined();
    expect(schemaIndex.socialIds).toBeDefined();
    expect(schemaIndex.emailOwnerTypes).toBeDefined();
    expect(schemaIndex.phoneOwnerTypes).toBeDefined();
    expect(schemaIndex.errorLogResolutionStatuses).toBeDefined();
  });
});
