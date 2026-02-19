import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { humanPhoneNumbers, humans } from "@humans/db/schema";
import { createId } from "@humans/db";
import { createPhoneNumberSchema, updatePhoneNumberSchema } from "@humans/shared";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { notFound } from "../lib/errors";
import type { AppContext } from "../types";

const phoneNumberRoutes = new Hono<AppContext>();

phoneNumberRoutes.use("/*", authMiddleware);

// List all phone numbers (with human name)
phoneNumberRoutes.get("/api/phone-numbers", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const allPhones = await db.select().from(humanPhoneNumbers);
  const allHumans = await db.select().from(humans);

  const data = allPhones.map((p) => {
    const human = allHumans.find((h) => h.id === p.humanId);
    return {
      ...p,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
    };
  });

  return c.json({ data });
});

// List phone numbers for a human
phoneNumberRoutes.get("/api/humans/:humanId/phone-numbers", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const humanId = c.req.param("humanId");
  const results = await db
    .select()
    .from(humanPhoneNumbers)
    .where(eq(humanPhoneNumbers.humanId, humanId));
  return c.json({ data: results });
});

// Create phone number
phoneNumberRoutes.post("/api/phone-numbers", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createPhoneNumberSchema.parse(body);
  const db = c.get("db");
  const now = new Date().toISOString();

  const phone = {
    id: createId(),
    humanId: data.humanId,
    phoneNumber: data.phoneNumber,
    labelId: data.labelId ?? null,
    hasWhatsapp: data.hasWhatsapp ?? false,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(humanPhoneNumbers).values(phone);
  return c.json({ data: phone }, 201);
});

// Update phone number
phoneNumberRoutes.patch("/api/phone-numbers/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updatePhoneNumberSchema.parse(body);
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.humanPhoneNumbers.findFirst({
    where: eq(humanPhoneNumbers.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.PHONE_NUMBER_NOT_FOUND, "Phone number not found");
  }

  await db
    .update(humanPhoneNumbers)
    .set(data)
    .where(eq(humanPhoneNumbers.id, id));

  const updated = await db.query.humanPhoneNumbers.findFirst({
    where: eq(humanPhoneNumbers.id, id),
  });
  return c.json({ data: updated });
});

// Delete phone number
phoneNumberRoutes.delete("/api/phone-numbers/:id", requirePermission("manageHumans"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.humanPhoneNumbers.findFirst({
    where: eq(humanPhoneNumbers.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.PHONE_NUMBER_NOT_FOUND, "Phone number not found");
  }

  await db.delete(humanPhoneNumbers).where(eq(humanPhoneNumbers.id, id));
  return c.json({ success: true });
});

export { phoneNumberRoutes };
