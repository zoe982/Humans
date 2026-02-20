import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  accountTypesConfig,
  accountHumanLabelsConfig,
  emailLabelsConfig,
  phoneLabelsConfig,
  accountEmailLabelsConfig,
  accountPhoneLabelsConfig,
  humanEmailLabelsConfig,
  humanPhoneLabelsConfig,
  socialIdPlatformsConfig,
} from "@humans/db/schema";
import { createId } from "@humans/db";
import { createConfigItemSchema, updateConfigItemSchema } from "@humans/shared";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { badRequest } from "../lib/errors";
import type { AppContext } from "../types";

const configTableMap = {
  "account-types": accountTypesConfig,
  "account-human-labels": accountHumanLabelsConfig,
  "email-labels": emailLabelsConfig,
  "phone-labels": phoneLabelsConfig,
  "account-email-labels": accountEmailLabelsConfig,
  "account-phone-labels": accountPhoneLabelsConfig,
  "human-email-labels": humanEmailLabelsConfig,
  "human-phone-labels": humanPhoneLabelsConfig,
  "social-id-platforms": socialIdPlatformsConfig,
} as const;

type ConfigType = keyof typeof configTableMap;

function isValidConfigType(value: string): value is ConfigType {
  return value in configTableMap;
}

const accountConfigRoutes = new Hono<AppContext>();

accountConfigRoutes.use("/*", authMiddleware);

// List config items
accountConfigRoutes.get("/api/admin/account-config/:configType", requirePermission("manageColleagues"), async (c) => {
  const configType = c.req.param("configType");
  if (!isValidConfigType(configType)) {
    throw badRequest(ERROR_CODES.INVALID_CONFIG_TYPE, "Invalid config type");
  }

  const db = c.get("db");
  const table = configTableMap[configType];
  const data = await db.select().from(table);

  return c.json({ data });
});

// Create config item
accountConfigRoutes.post("/api/admin/account-config/:configType", requirePermission("manageColleagues"), async (c) => {
  const configType = c.req.param("configType");
  if (!isValidConfigType(configType)) {
    throw badRequest(ERROR_CODES.INVALID_CONFIG_TYPE, "Invalid config type");
  }

  const body: unknown = await c.req.json();
  const data = createConfigItemSchema.parse(body);
  const db = c.get("db");
  const table = configTableMap[configType];
  const now = new Date().toISOString();

  const item = {
    id: createId(),
    name: data.name,
    createdAt: now,
  };

  await db.insert(table).values(item);
  return c.json({ data: item }, 201);
});

// Update config item
accountConfigRoutes.patch("/api/admin/account-config/:configType/:id", requirePermission("manageColleagues"), async (c) => {
  const configType = c.req.param("configType");
  if (!isValidConfigType(configType)) {
    throw badRequest(ERROR_CODES.INVALID_CONFIG_TYPE, "Invalid config type");
  }

  const body: unknown = await c.req.json();
  const data = updateConfigItemSchema.parse(body);
  const db = c.get("db");
  const table = configTableMap[configType];
  const id = c.req.param("id");

  await db.update(table).set({ name: data.name }).where(eq(table.id, id));

  return c.json({ success: true });
});

// Delete config item
accountConfigRoutes.delete("/api/admin/account-config/:configType/:id", requirePermission("manageColleagues"), async (c) => {
  const configType = c.req.param("configType");
  if (!isValidConfigType(configType)) {
    throw badRequest(ERROR_CODES.INVALID_CONFIG_TYPE, "Invalid config type");
  }

  const db = c.get("db");
  const table = configTableMap[configType];
  const id = c.req.param("id");

  await db.delete(table).where(eq(table.id, id));

  return c.json({ success: true });
});

export { accountConfigRoutes };
