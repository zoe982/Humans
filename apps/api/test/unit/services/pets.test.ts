import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  getPetCount,
  listPetsForHuman,
  getPet,
  createPet,
  updatePet,
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
    name,
    breed: "Labrador",
    weight: 30,
    age: 5,
    specialNeeds: null,
    healthCertR2Key: null,
    vaccinationR2Key: null,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

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
