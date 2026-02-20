import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listPhoneNumbers,
  listPhoneNumbersForHuman,
  createPhoneNumber,
  updatePhoneNumber,
  deletePhoneNumber,
} from "../../../src/services/phone-numbers";
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

async function seedPhone(
  db: ReturnType<typeof getTestDb>,
  id = "ph-1",
  ownerId = "h-1",
  phoneNumber = "+1234567890",
) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.phones).values({
    id,
    displayId: `FON-${String(seedCounter).padStart(6, "0")}`,
    ownerType: "human",
    ownerId,
    phoneNumber,
    hasWhatsapp: false,
    isPrimary: true,
    createdAt: ts,
  });
  return id;
}

describe("listPhoneNumbers", () => {
  it("returns empty list when no phone numbers", async () => {
    const db = getTestDb();
    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(0);
  });

  it("returns phone numbers with human names", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedPhone(db, "ph-1", "h-1", "+1111111111");

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.phoneNumber).toBe("+1111111111");
    expect(result[0]!.ownerName).toBe("Alice Smith");
  });

  it("returns multiple phone numbers across different humans", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedPhone(db, "ph-1", "h-1", "+1111111111");
    await seedPhone(db, "ph-2", "h-2", "+2222222222");

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(2);

    const alice = result.find((p) => p.ownerId === "h-1");
    const bob = result.find((p) => p.ownerId === "h-2");
    expect(alice!.ownerName).toBe("Alice Smith");
    expect(bob!.ownerName).toBe("Bob Jones");
  });
});

describe("listPhoneNumbersForHuman", () => {
  it("returns only phones for the given human", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedPhone(db, "ph-1", "h-1", "+1111111111");
    await seedPhone(db, "ph-2", "h-2", "+2222222222");

    const result = await listPhoneNumbersForHuman(db, "h-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.phoneNumber).toBe("+1111111111");
  });

  it("returns empty list when human has no phones", async () => {
    const db = getTestDb();
    const result = await listPhoneNumbersForHuman(db, "h-nonexistent");
    expect(result).toHaveLength(0);
  });
});

describe("createPhoneNumber", () => {
  it("creates a phone number with defaults", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPhoneNumber(db, {
      humanId: "h-1",
      phoneNumber: "+9876543210",
    });

    expect(result.id).toBeDefined();
    expect(result.ownerId).toBe("h-1");
    expect(result.ownerType).toBe("human");
    expect(result.phoneNumber).toBe("+9876543210");
    expect(result.hasWhatsapp).toBe(false);
    expect(result.isPrimary).toBe(false);
    expect(result.labelId).toBeNull();

    const rows = await db.select().from(schema.phones);
    expect(rows).toHaveLength(1);
  });

  it("creates a phone number with custom flags", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPhoneNumber(db, {
      humanId: "h-1",
      phoneNumber: "+5555555555",
      hasWhatsapp: true,
      isPrimary: true,
    });

    expect(result.hasWhatsapp).toBe(true);
    expect(result.isPrimary).toBe(true);
  });
});

describe("updatePhoneNumber", () => {
  it("throws not found for missing phone number", async () => {
    const db = getTestDb();
    await expect(
      updatePhoneNumber(db, "nonexistent", { phoneNumber: "+000" }),
    ).rejects.toThrowError("Phone number not found");
  });

  it("updates phone number fields", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedPhone(db, "ph-1", "h-1", "+1111111111");

    const result = await updatePhoneNumber(db, "ph-1", {
      phoneNumber: "+9999999999",
      hasWhatsapp: true,
    });

    expect(result!.phoneNumber).toBe("+9999999999");
    expect(result!.hasWhatsapp).toBe(true);
  });
});

describe("deletePhoneNumber", () => {
  it("throws not found for missing phone number", async () => {
    const db = getTestDb();
    await expect(
      deletePhoneNumber(db, "nonexistent"),
    ).rejects.toThrowError("Phone number not found");
  });

  it("deletes an existing phone number", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedPhone(db, "ph-1", "h-1");

    await deletePhoneNumber(db, "ph-1");

    const rows = await db.select().from(schema.phones);
    expect(rows).toHaveLength(0);
  });
});
