import { describe, it, expect } from "vitest";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { colleagues, roles } from "./colleagues";
import { pets } from "./pets";
import { leadSources, leadSourceCategories } from "./lead-sources";
import { leadEvents, leadEventTypes } from "./lead-events";
import { auditLog } from "./audit-log";
import { humans, humanStatuses } from "./humans";
import { emails } from "./emails";
import { emailLabelsConfig } from "./email-labels-config";
import { humanTypes, humanTypeValues } from "./human-types";
import { humanRouteSignups } from "./human-route-signups";
import { humanWebsiteBookingRequests } from "./human-website-booking-requests";
import { lossReasonsConfig } from "./loss-reasons-config";
import { phones } from "./phones";
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
import { opportunityHumans } from "./opportunity-humans";
import { opportunityPets } from "./opportunity-pets";
import { websites } from "./websites";
import { activityOpportunities } from "./activity-opportunities";
import { agreements, agreementStatuses } from "./agreements";
import { documents } from "./documents";
import { entityNextActions, entityNextActionTypes } from "./entity-next-actions";
import { generalLeads, generalLeadStatuses } from "./general-leads";
import { leadScores } from "./lead-scores";

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

  it("humanWebsiteBookingRequests table has correct name", () => {
    expect(getTableName(humanWebsiteBookingRequests)).toBe("human_website_booking_requests");
  });

  it("lossReasonsConfig table has correct name", () => {
    expect(getTableName(lossReasonsConfig)).toBe("loss_reasons_config");
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
    expect(config.indexes.length).toBe(3);
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

  it("opportunityHumans table has 2 indexes", () => {
    const config = getTableConfig(opportunityHumans);
    expect(config.indexes.length).toBe(2);
  });

  it("opportunityPets table has 2 indexes", () => {
    const config = getTableConfig(opportunityPets);
    expect(config.indexes.length).toBe(2);
  });

  it("websites table has 3 indexes", () => {
    const config = getTableConfig(websites);
    expect(config.indexes.length).toBe(3);
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
    expect(schemaIndex.humanWebsiteBookingRequests).toBeDefined();
    expect(schemaIndex.lossReasonsConfig).toBeDefined();
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
    expect(schemaIndex.errorLogResolutionStatuses).toBeDefined();
  });
});

describe("humanRouteSignups schema", () => {
  it("has a unique index on routeSignupId", () => {
    const config = getTableConfig(humanRouteSignups);
    const idx = config.indexes.find((i) => i.config.name === "human_route_signups_route_signup_id_unique");
    expect(idx).toBeDefined();
  });
});

describe("humanWebsiteBookingRequests schema", () => {
  it("has a unique index on websiteBookingRequestId", () => {
    const config = getTableConfig(humanWebsiteBookingRequests);
    const idx = config.indexes.find((i) => i.config.name === "human_website_booking_requests_wbr_id_unique");
    expect(idx).toBeDefined();
  });
});

describe("activities schema", () => {
  it("activities table has a conditional unique index on front_id", () => {
    const config = getTableConfig(activities);
    expect(config.indexes.length).toBeGreaterThanOrEqual(1);
    const frontIdIndex = config.indexes.find((idx) =>
      idx.config.name === "activities_front_id_unique",
    );
    expect(frontIdIndex).toBeDefined();
  });
});

describe("activityOpportunities schema", () => {
  it("activityOpportunities table has correct name", () => {
    expect(getTableName(activityOpportunities)).toBe("activity_opportunities");
  });

  it("activityOpportunities table has 3 indexes", () => {
    const config = getTableConfig(activityOpportunities);
    expect(config.indexes.length).toBe(3);
  });
});

describe("agreements schema", () => {
  it("agreements table has correct name", () => {
    expect(getTableName(agreements)).toBe("agreements");
  });

  it("agreements table has 2 indexes", () => {
    const config = getTableConfig(agreements);
    expect(config.indexes.length).toBe(2);
  });

  it("agreementStatuses contains expected values", () => {
    expect(agreementStatuses).toStrictEqual(["open", "active", "closed_inactive"]);
  });
});

describe("documents schema", () => {
  it("documents table has correct name", () => {
    expect(getTableName(documents)).toBe("documents");
  });

  it("documents table has 2 indexes", () => {
    const config = getTableConfig(documents);
    expect(config.indexes.length).toBe(2);
  });
});

describe("entityNextActions schema", () => {
  it("entityNextActions table has correct name", () => {
    expect(getTableName(entityNextActions)).toBe("entity_next_actions");
  });

  it("entityNextActions table has a unique index on entity_type and entity_id", () => {
    const config = getTableConfig(entityNextActions);
    expect(config.indexes.length).toBe(1);
    const uniqueIdx = config.indexes.find((idx) =>
      idx.config.name === "entity_next_actions_entity_type_entity_id_unique",
    );
    expect(uniqueIdx).toBeDefined();
  });

  it("entityNextActionTypes contains expected values", () => {
    expect(entityNextActionTypes).toStrictEqual([
      "route_signup",
      "general_lead",
      "website_booking_request",
    ]);
  });
});

describe("generalLeads schema", () => {
  it("generalLeads table has correct name", () => {
    expect(getTableName(generalLeads)).toBe("general_leads");
  });

  it("generalLeads table has a conditional unique index on front_conversation_id", () => {
    const config = getTableConfig(generalLeads);
    expect(config.indexes.length).toBeGreaterThanOrEqual(1);
    const frontConvIdx = config.indexes.find((idx) =>
      idx.config.name === "general_leads_front_conversation_id_unique",
    );
    expect(frontConvIdx).toBeDefined();
  });

  it("generalLeadStatuses contains expected values", () => {
    expect(generalLeadStatuses).toStrictEqual([
      "open",
      "qualified",
      "closed_converted",
      "closed_rejected",
    ]);
  });
});

describe("leadScores schema", () => {
  it("leadScores table has correct name", () => {
    expect(getTableName(leadScores)).toBe("lead_scores");
  });

  it("leadScores table has 4 indexes", () => {
    const config = getTableConfig(leadScores);
    expect(config.indexes.length).toBe(4);
  });

  it("leadScores table has a unique index on general_lead_id", () => {
    const config = getTableConfig(leadScores);
    const uniqueIdx = config.indexes.find((idx) =>
      idx.config.name === "lead_scores_general_lead_id_unique",
    );
    expect(uniqueIdx).toBeDefined();
  });
});
