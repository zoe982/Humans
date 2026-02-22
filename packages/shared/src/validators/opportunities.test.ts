import { describe, it, expect } from "vitest";
import {
  opportunityStageEnum,
  createOpportunitySchema,
  updateOpportunitySchema,
  updateOpportunityStageSchema,
  updateNextActionSchema,
  linkOpportunityHumanSchema,
  updateOpportunityHumanSchema,
  linkOpportunityPetSchema,
} from "./opportunities";

describe("opportunityStageEnum", () => {
  it("accepts all valid stages", () => {
    const stages = [
      "open", "qualified", "deposit_request_sent", "deposit_received",
      "group_forming", "confirmed_to_operate", "paid", "docs_in_progress",
      "docs_complete", "closed_flown", "closed_lost",
    ];
    for (const stage of stages) {
      expect(opportunityStageEnum.parse(stage)).toBe(stage);
    }
  });

  it("rejects invalid stage", () => {
    expect(() => opportunityStageEnum.parse("invalid")).toThrowError();
  });
});

describe("createOpportunitySchema", () => {
  it("accepts minimal input with defaults", () => {
    const result = createOpportunitySchema.parse({});
    expect(result.stage).toBe("open");
    expect(result.seatsRequested).toBe(1);
  });

  it("accepts explicit stage and seats", () => {
    const result = createOpportunitySchema.parse({ stage: "qualified", seatsRequested: 3 });
    expect(result.stage).toBe("qualified");
    expect(result.seatsRequested).toBe(3);
  });

  it("rejects seatsRequested less than 1", () => {
    expect(() => createOpportunitySchema.parse({ seatsRequested: 0 })).toThrowError();
  });

  it("rejects non-integer seatsRequested", () => {
    expect(() => createOpportunitySchema.parse({ seatsRequested: 1.5 })).toThrowError();
  });

  it("requires lossReason when stage is closed_lost", () => {
    expect(() => createOpportunitySchema.parse({ stage: "closed_lost" })).toThrowError();
  });

  it("requires non-empty lossReason when stage is closed_lost", () => {
    expect(() => createOpportunitySchema.parse({ stage: "closed_lost", lossReason: "  " })).toThrowError();
  });

  it("accepts closed_lost with lossReason", () => {
    const result = createOpportunitySchema.parse({ stage: "closed_lost", lossReason: "Budget constraints" });
    expect(result.stage).toBe("closed_lost");
    expect(result.lossReason).toBe("Budget constraints");
  });

  it("does not require lossReason for non-lost stages", () => {
    const result = createOpportunitySchema.parse({ stage: "closed_flown" });
    expect(result.stage).toBe("closed_flown");
  });

  it("rejects lossReason over 2000 chars", () => {
    expect(() => createOpportunitySchema.parse({ stage: "closed_lost", lossReason: "a".repeat(2001) })).toThrowError();
  });
});

describe("updateOpportunitySchema", () => {
  it("accepts empty object", () => {
    expect(updateOpportunitySchema.parse({})).toStrictEqual({});
  });

  it("accepts seatsRequested update", () => {
    const result = updateOpportunitySchema.parse({ seatsRequested: 5 });
    expect(result.seatsRequested).toBe(5);
  });

  it("accepts nullable lossReason", () => {
    const result = updateOpportunitySchema.parse({ lossReason: null });
    expect(result.lossReason).toBeNull();
  });

  it("rejects seatsRequested less than 1", () => {
    expect(() => updateOpportunitySchema.parse({ seatsRequested: 0 })).toThrowError();
  });
});

describe("updateOpportunityStageSchema", () => {
  it("accepts valid stage", () => {
    const result = updateOpportunityStageSchema.parse({ stage: "qualified" });
    expect(result.stage).toBe("qualified");
  });

  it("requires lossReason for closed_lost", () => {
    expect(() => updateOpportunityStageSchema.parse({ stage: "closed_lost" })).toThrowError();
  });

  it("accepts closed_lost with lossReason", () => {
    const result = updateOpportunityStageSchema.parse({ stage: "closed_lost", lossReason: "Too expensive" });
    expect(result.stage).toBe("closed_lost");
    expect(result.lossReason).toBe("Too expensive");
  });

  it("does not require lossReason for other stages", () => {
    const result = updateOpportunityStageSchema.parse({ stage: "deposit_received" });
    expect(result.stage).toBe("deposit_received");
  });
});

describe("updateNextActionSchema", () => {
  const valid = {
    ownerId: "col-1",
    description: "Follow up on deposit",
    type: "email" as const,
    dueDate: "2025-01-15T10:00:00.000Z",
  };

  it("accepts valid input", () => {
    const result = updateNextActionSchema.parse(valid);
    expect(result.ownerId).toBe("col-1");
    expect(result.description).toBe("Follow up on deposit");
    expect(result.type).toBe("email");
  });

  it("requires all fields", () => {
    expect(() => updateNextActionSchema.parse({})).toThrowError();
    expect(() => updateNextActionSchema.parse({ ownerId: "col-1" })).toThrowError();
  });

  it("rejects empty ownerId", () => {
    expect(() => updateNextActionSchema.parse({ ...valid, ownerId: "" })).toThrowError();
  });

  it("rejects empty description", () => {
    expect(() => updateNextActionSchema.parse({ ...valid, description: "" })).toThrowError();
  });

  it("rejects description over 1000 chars", () => {
    expect(() => updateNextActionSchema.parse({ ...valid, description: "a".repeat(1001) })).toThrowError();
  });

  it("accepts all valid activity types", () => {
    for (const type of ["email", "whatsapp_message", "online_meeting", "phone_call", "social_message"]) {
      const result = updateNextActionSchema.parse({ ...valid, type });
      expect(result.type).toBe(type);
    }
  });

  it("rejects invalid type", () => {
    expect(() => updateNextActionSchema.parse({ ...valid, type: "invalid" })).toThrowError();
  });
});

describe("linkOpportunityHumanSchema", () => {
  it("requires humanId", () => {
    expect(() => linkOpportunityHumanSchema.parse({})).toThrowError();
  });

  it("accepts humanId with optional roleId", () => {
    const result = linkOpportunityHumanSchema.parse({ humanId: "h-1" });
    expect(result.humanId).toBe("h-1");
    expect(result.roleId).toBeUndefined();
  });

  it("accepts humanId with roleId", () => {
    const result = linkOpportunityHumanSchema.parse({ humanId: "h-1", roleId: "r-1" });
    expect(result.roleId).toBe("r-1");
  });

  it("rejects empty humanId", () => {
    expect(() => linkOpportunityHumanSchema.parse({ humanId: "" })).toThrowError();
  });
});

describe("updateOpportunityHumanSchema", () => {
  it("requires roleId", () => {
    expect(() => updateOpportunityHumanSchema.parse({})).toThrowError();
  });

  it("accepts valid roleId", () => {
    const result = updateOpportunityHumanSchema.parse({ roleId: "r-1" });
    expect(result.roleId).toBe("r-1");
  });
});

describe("linkOpportunityPetSchema", () => {
  it("requires petId", () => {
    expect(() => linkOpportunityPetSchema.parse({})).toThrowError();
  });

  it("accepts valid petId", () => {
    const result = linkOpportunityPetSchema.parse({ petId: "p-1" });
    expect(result.petId).toBe("p-1");
  });

  it("rejects empty petId", () => {
    expect(() => linkOpportunityPetSchema.parse({ petId: "" })).toThrowError();
  });
});
