import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  getPetCount,
  listPets,
  listPetsForHuman,
  getPet,
  createPet,
  deletePet,
  updatePet,
  getOpportunitiesForPet,
} from "../../../src/services/pets";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;

async function seedHuman(db: ReturnType<typeof getTestDb>, id = "h-1", first = "John", last = "Doe") {
  seedCounter++;
  const ts = now();
  await db.insert(schema.humans).values({
    id,
    displayId: `HUM-${String(seedCounter).padStart(6, "0")}`,
    firstName: first,
    lastName: last,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedPet(
  db: ReturnType<typeof getTestDb>,
  id = "pet-1",
  humanId = "h-1",
  name = "Buddy",
) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.pets).values({
    id,
    displayId: `PET-${String(seedCounter).padStart(6, "0")}`,
    humanId,
    type: "dog",
    name,
    breed: "Labrador",
    weight: 30,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

describe("listPets", () => {
  it("returns empty list when no pets exist", async () => {
    const db = getTestDb();
    const result = await listPets(db);
    expect(result).toHaveLength(0);
  });

  it("returns empty string for humanId when pet has null humanId (no owner)", async () => {
    const db = getTestDb();
    const ts = now();
    seedCounter++;
    await db.insert(schema.pets).values({
      id: "pet-no-owner",
      displayId: `PET-${String(seedCounter).padStart(6, "0")}`,
      humanId: null,
      type: "bird",
      name: "Tweety",
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await listPets(db);
    expect(result).toHaveLength(1);
    // humanId ?? "" branch
    expect(result[0]!.humanId).toBe("");
  });

  it("returns empty string for name when pet name is null", async () => {
    const db = getTestDb();
    const ts = now();
    seedCounter++;
    await db.insert(schema.pets).values({
      id: "pet-no-name",
      displayId: `PET-${String(seedCounter).padStart(6, "0")}`,
      humanId: null,
      type: "cat",
      name: null,
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await listPets(db);
    expect(result).toHaveLength(1);
    // name ?? "" branch
    expect(result[0]!.name).toBe("");
  });

  it("returns pets enriched with owner name and displayId", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedPet(db, "pet-1", "h-1", "Buddy");

    const result = await listPets(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Buddy");
    expect(result[0]!.ownerName).toBe("Alice Smith");
    expect(result[0]!.ownerDisplayId).toMatch(/^HUM-/);
  });

  it("returns null ownerName for pets without a human", async () => {
    const db = getTestDb();
    const ts = now();
    seedCounter++;
    await db.insert(schema.pets).values({
      id: "pet-orphan",
      displayId: `PET-${String(seedCounter).padStart(6, "0")}`,
      humanId: null,
      type: "cat",
      name: "Whiskers",
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await listPets(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.ownerName).toBeNull();
  });
});

describe("getPetCount", () => {
  it("returns zero when no pets exist", async () => {
    const db = getTestDb();
    const result = await getPetCount(db);
    expect(result.total).toBe(0);
  });

  it("returns correct count with pets", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedPet(db, "pet-1", "h-1", "Buddy");
    await seedPet(db, "pet-2", "h-1", "Max");

    const result = await getPetCount(db);
    expect(result.total).toBe(2);
  });
});

describe("listPetsForHuman", () => {
  it("returns only pets for the given human", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2", "Jane", "Doe");
    await seedPet(db, "pet-1", "h-1", "Buddy");
    await seedPet(db, "pet-2", "h-2", "Max");

    const result = await listPetsForHuman(db, "h-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Buddy");
  });

  it("returns empty list when human has no pets", async () => {
    const db = getTestDb();
    const result = await listPetsForHuman(db, "h-nonexistent");
    expect(result).toHaveLength(0);
  });
});

describe("getPet", () => {
  it("throws not found for missing pet", async () => {
    const db = getTestDb();
    await expect(getPet(db, "nonexistent")).rejects.toThrowError("Pet not found");
  });

  it("returns pet by id", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedPet(db, "pet-1", "h-1", "Buddy");

    const result = await getPet(db, "pet-1");
    expect(result.id).toBe("pet-1");
    expect(result.name).toBe("Buddy");
    expect(result.breed).toBe("Labrador");
  });

  it("returns empty string for humanId when pet has null humanId", async () => {
    const db = getTestDb();
    const ts = now();
    seedCounter++;
    await db.insert(schema.pets).values({
      id: "pet-orphan-get",
      displayId: `PET-${String(seedCounter).padStart(6, "0")}`,
      humanId: null,
      type: "rabbit",
      name: "Fluffy",
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await getPet(db, "pet-orphan-get");
    // humanId ?? "" branch in getPet
    expect(result.humanId).toBe("");
    expect(result.ownerName).toBeNull();
    expect(result.ownerDisplayId).toBeNull();
  });

  it("returns empty string for name when pet name is null", async () => {
    const db = getTestDb();
    const ts = now();
    seedCounter++;
    await db.insert(schema.pets).values({
      id: "pet-noname-get",
      displayId: `PET-${String(seedCounter).padStart(6, "0")}`,
      humanId: null,
      type: "fish",
      name: null,
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await getPet(db, "pet-noname-get");
    // name ?? "" branch in getPet
    expect(result.name).toBe("");
  });
});

describe("createPet", () => {
  it("creates a pet with required fields", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPet(db, {
      humanId: "h-1",
      name: "Fido",
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe("Fido");
    expect(result.humanId).toBe("h-1");
    expect(result.breed).toBeNull();
    expect(result.weight).toBeNull();
    expect(result.isActive).toBe(true);

    const rows = await db.select().from(schema.pets);
    expect(rows).toHaveLength(1);
  });

  it("creates a pet with optional fields", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPet(db, {
      humanId: "h-1",
      name: "Rex",
      breed: "German Shepherd",
      weight: 40,
    });

    expect(result.breed).toBe("German Shepherd");
    expect(result.weight).toBe(40);
  });

  it("defaults type to 'dog' when type is not provided", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPet(db, {
      humanId: "h-1",
      name: "Mystery",
      // type is intentionally omitted — should default to "dog"
    });

    expect(result.type).toBe("dog");
  });

  it("uses provided type when specified", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPet(db, {
      humanId: "h-1",
      name: "Whiskers",
      type: "cat",
    });

    expect(result.type).toBe("cat");
  });

  it("defaults name to empty string when name is not provided", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPet(db, {
      humanId: "h-1",
      // name omitted — should default to ""
    });

    expect(result.name).toBe("");
  });

  it("defaults breed to null when breed is not provided", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPet(db, {
      humanId: "h-1",
      name: "Unnamed",
    });

    expect(result.breed).toBeNull();
  });

  it("defaults weight to null when weight is not provided", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPet(db, {
      humanId: "h-1",
      name: "Slim",
    });

    expect(result.weight).toBeNull();
  });

  it("defaults notes to null when notes is not provided", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPet(db, {
      humanId: "h-1",
      name: "Quiet",
    });

    expect(result.notes).toBeNull();
  });
});

describe("deletePet", () => {
  it("throws not found for missing pet", async () => {
    const db = getTestDb();
    await expect(deletePet(db, "nonexistent")).rejects.toThrowError("Pet not found");
  });

  it("deletes a pet successfully", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedPet(db, "pet-1", "h-1", "Buddy");

    await deletePet(db, "pet-1");

    const rows = await db.select().from(schema.pets);
    expect(rows).toHaveLength(0);
  });
});

describe("updatePet", () => {
  it("throws not found for missing pet", async () => {
    const db = getTestDb();
    await expect(
      updatePet(db, "nonexistent", { name: "X" }),
    ).rejects.toThrowError("Pet not found");
  });

  it("updates pet fields", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedPet(db, "pet-1", "h-1", "Buddy");

    const result = await updatePet(db, "pet-1", { name: "Bud", weight: 35 });

    expect(result!.name).toBe("Bud");
    expect(result!.weight).toBe(35);
    expect(result!.updatedAt).toBeDefined();
  });
});

async function seedOpportunity(
  db: ReturnType<typeof getTestDb>,
  id: string,
  displayId: string,
  stage = "open",
) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.opportunities).values({
    id,
    displayId,
    stage,
    seatsRequested: 1,
    passengerSeats: 1,
    petSeats: 0,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedOpportunityPetLink(
  db: ReturnType<typeof getTestDb>,
  id: string,
  opportunityId: string,
  petId: string,
) {
  await db.insert(schema.opportunityPets).values({
    id,
    opportunityId,
    petId,
    createdAt: now(),
  });
}

async function seedOpportunityHumanRoleConfig(
  db: ReturnType<typeof getTestDb>,
  id: string,
  name: string,
) {
  await db.insert(schema.opportunityHumanRolesConfig).values({
    id,
    name,
    createdAt: now(),
  });
}

async function seedOpportunityHumanLink(
  db: ReturnType<typeof getTestDb>,
  id: string,
  opportunityId: string,
  humanId: string,
  roleId: string,
) {
  await db.insert(schema.opportunityHumans).values({
    id,
    opportunityId,
    humanId,
    roleId,
    createdAt: now(),
  });
}

describe("getOpportunitiesForPet", () => {
  it("returns empty array when pet has no linked opportunities", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedPet(db, "pet-1", "h-1", "Buddy");

    const result = await getOpportunitiesForPet(db, "pet-1");

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("returns opportunity with populated primaryHumanName when primary role config exists", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Walker");
    await seedPet(db, "pet-1", "h-1", "Buddy");
    await seedOpportunity(db, "opp-1", "OPP-AAA-001", "open");
    await seedOpportunityPetLink(db, "link-1", "opp-1", "pet-1");
    await seedOpportunityHumanRoleConfig(db, "role-1", "primary");
    await seedOpportunityHumanLink(db, "oh-1", "opp-1", "h-1", "role-1");

    const result = await getOpportunitiesForPet(db, "pet-1");

    expect(result).toHaveLength(1);
    expect(result[0]!.linkId).toBe("link-1");
    expect(result[0]!.id).toBe("opp-1");
    expect(result[0]!.displayId).toBe("OPP-AAA-001");
    expect(result[0]!.stage).toBe("open");
    expect(result[0]!.primaryHumanName).toBe("Alice Walker");
    expect(result[0]!.createdAt).toBeTruthy();
  });

  it("returns null primaryHumanName when no primary role config exists", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Bob", "Smith");
    await seedPet(db, "pet-1", "h-1", "Rex");
    await seedOpportunity(db, "opp-1", "OPP-AAA-002", "qualified");
    await seedOpportunityPetLink(db, "link-1", "opp-1", "pet-1");
    // Seed only a non-primary role config — no "primary" entry
    await seedOpportunityHumanRoleConfig(db, "role-1", "secondary");
    await seedOpportunityHumanLink(db, "oh-1", "opp-1", "h-1", "role-1");

    const result = await getOpportunitiesForPet(db, "pet-1");

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("opp-1");
    expect(result[0]!.primaryHumanName).toBeNull();
  });

  it("returns multiple links with correct data for each", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Carol", "Jones");
    await seedPet(db, "pet-1", "h-1", "Max");
    await seedOpportunity(db, "opp-1", "OPP-AAA-003", "won");
    await seedOpportunity(db, "opp-2", "OPP-AAA-004", "qualified");
    await seedOpportunityPetLink(db, "link-1", "opp-1", "pet-1");
    await seedOpportunityPetLink(db, "link-2", "opp-2", "pet-1");

    const result = await getOpportunitiesForPet(db, "pet-1");

    expect(result).toHaveLength(2);

    const first = result.find((r) => r.linkId === "link-1");
    expect(first).toBeDefined();
    expect(first!.id).toBe("opp-1");
    expect(first!.displayId).toBe("OPP-AAA-003");
    expect(first!.stage).toBe("won");
    expect(first!.primaryHumanName).toBeNull();

    const second = result.find((r) => r.linkId === "link-2");
    expect(second).toBeDefined();
    expect(second!.id).toBe("opp-2");
    expect(second!.displayId).toBe("OPP-AAA-004");
    expect(second!.stage).toBe("qualified");
  });
});
