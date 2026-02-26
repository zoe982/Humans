import { describe, it, expect } from "vitest";
import * as validators from "./index";

describe("validators/index re-exports", () => {
  it("exports createPetSchema", () => {
    expect(validators.createPetSchema).toBeDefined();
  });

  it("exports updatePetSchema", () => {
    expect(validators.updatePetSchema).toBeDefined();
  });

it("exports createLeadSourceSchema", () => {
    expect(validators.createLeadSourceSchema).toBeDefined();
  });

  it("exports createLeadEventSchema", () => {
    expect(validators.createLeadEventSchema).toBeDefined();
  });

  it("exports createColleagueSchema", () => {
    expect(validators.createColleagueSchema).toBeDefined();
  });

  it("exports updateColleagueSchema", () => {
    expect(validators.updateColleagueSchema).toBeDefined();
  });

  it("exports createHumanSchema", () => {
    expect(validators.createHumanSchema).toBeDefined();
  });

  it("exports updateHumanSchema", () => {
    expect(validators.updateHumanSchema).toBeDefined();
  });

  it("exports humanTypeEnum", () => {
    expect(validators.humanTypeEnum).toBeDefined();
  });

  it("exports humanStatusEnum", () => {
    expect(validators.humanStatusEnum).toBeDefined();
  });

  it("exports updateRouteSignupStatusSchema", () => {
    expect(validators.updateRouteSignupStatusSchema).toBeDefined();
  });

  it("exports routeSignupStatuses", () => {
    expect(validators.routeSignupStatuses).toBeDefined();
  });

  it("exports createActivitySchema", () => {
    expect(validators.createActivitySchema).toBeDefined();
  });

  it("exports activityTypes", () => {
    expect(validators.activityTypes).toBeDefined();
  });

  it("exports createPhoneNumberSchema", () => {
    expect(validators.createPhoneNumberSchema).toBeDefined();
  });

  it("exports searchQuerySchema", () => {
    expect(validators.searchQuerySchema).toBeDefined();
  });

  it("exports createGeoInterestSchema", () => {
    expect(validators.createGeoInterestSchema).toBeDefined();
  });

  it("exports createEmailSchema", () => {
    expect(validators.createEmailSchema).toBeDefined();
  });

  it("exports createAccountSchema", () => {
    expect(validators.createAccountSchema).toBeDefined();
  });

  it("exports accountStatusEnum", () => {
    expect(validators.accountStatusEnum).toBeDefined();
  });

  it("exports createConfigItemSchema", () => {
    expect(validators.createConfigItemSchema).toBeDefined();
  });

  it("exports linkAccountHumanSchema", () => {
    expect(validators.linkAccountHumanSchema).toBeDefined();
  });

  it("exports response schema wrappers", () => {
    expect(validators.paginationMetaSchema).toBeDefined();
    expect(validators.listResponse).toBeDefined();
    expect(validators.detailResponse).toBeDefined();
    expect(validators.successResponseSchema).toBeDefined();
  });

  it("exports human response schemas", () => {
    expect(validators.humanListItemSchema).toBeDefined();
    expect(validators.humanDetailSchema).toBeDefined();
    expect(validators.emailResponseSchema).toBeDefined();
  });

  it("exports activity response schemas", () => {
    expect(validators.activityListItemSchema).toBeDefined();
    expect(validators.activityDetailSchema).toBeDefined();
  });

  it("exports account response schemas", () => {
    expect(validators.accountListItemSchema).toBeDefined();
    expect(validators.accountDetailSchema).toBeDefined();
  });

  it("exports opportunity response schemas", () => {
    expect(validators.opportunityListItemSchema).toBeDefined();
    expect(validators.opportunityDetailSchema).toBeDefined();
  });

  it("exports general lead response schemas", () => {
    expect(validators.generalLeadListItemSchema).toBeDefined();
    expect(validators.generalLeadDetailSchema).toBeDefined();
  });
});
