import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  accountTypesConfig,
  accountHumanLabelsConfig,
  accountEmailLabelsConfig,
  accountPhoneLabelsConfig,
  humanEmailLabelsConfig,
  humanPhoneLabelsConfig,
  socialIdPlatformsConfig,
  opportunityHumanRolesConfig,
  humanRelationshipLabelsConfig,
  agreementTypesConfig,
  leadSourcesConfig,
  leadChannelsConfig,
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
  "account-email-labels": accountEmailLabelsConfig,
  "account-phone-labels": accountPhoneLabelsConfig,
  "human-email-labels": humanEmailLabelsConfig,
  "human-phone-labels": humanPhoneLabelsConfig,
  "social-id-platforms": socialIdPlatformsConfig,
  "opportunity-human-roles": opportunityHumanRolesConfig,
  "human-relationship-labels": humanRelationshipLabelsConfig,
  "agreement-types": agreementTypesConfig,
  "lead-sources": leadSourcesConfig,
  "lead-channels": leadChannelsConfig,
} as const;

type ConfigType = keyof typeof configTableMap;

function isValidConfigType(value: string): value is ConfigType {
  return value in configTableMap;
}

function getConfigTable(configType: ConfigType): (typeof configTableMap)[ConfigType] {
  switch (configType) {
    case "account-types": return accountTypesConfig;
    case "account-human-labels": return accountHumanLabelsConfig;
    case "account-email-labels": return accountEmailLabelsConfig;
    case "account-phone-labels": return accountPhoneLabelsConfig;
    case "human-email-labels": return humanEmailLabelsConfig;
    case "human-phone-labels": return humanPhoneLabelsConfig;
    case "social-id-platforms": return socialIdPlatformsConfig;
    case "opportunity-human-roles": return opportunityHumanRolesConfig;
    case "human-relationship-labels": return humanRelationshipLabelsConfig;
    case "agreement-types": return agreementTypesConfig;
    case "lead-sources": return leadSourcesConfig;
    case "lead-channels": return leadChannelsConfig;
  }
}

const accountConfigRoutes = new Hono<AppContext>();

accountConfigRoutes.use("/*", authMiddleware);

// Batch fetch multiple config types in one request
accountConfigRoutes.get("/api/admin/account-config/batch", requirePermission("viewRecords"), async (c) => {
  const typesParam = c.req.query("types");
  const rawTypes: string[] = typesParam !== undefined && typesParam !== ""
    ? typesParam.split(",").map((t) => t.trim())
    : Object.keys(configTableMap);

  for (const t of rawTypes) {
    if (!isValidConfigType(t)) {
      throw badRequest(ERROR_CODES.INVALID_CONFIG_TYPE, `Invalid config type: ${t}`);
    }
  }

  const requestedTypes = rawTypes.filter(isValidConfigType);

  const db = c.get("db");
  const entries = await Promise.all(
    requestedTypes.map(async (t) => {
      const table = getConfigTable(t);
      const data = await db.select().from(table);
      return [t, data] as const;
    }),
  );

  const result = Object.fromEntries(entries);

  return c.json({ data: result });
});

// List config items (readable by anyone who can view records — needed for dropdown labels on human/account detail pages)
accountConfigRoutes.get("/api/admin/account-config/:configType", requirePermission("viewRecords"), async (c) => {
  const configType = c.req.param("configType");
  if (!isValidConfigType(configType)) {
    throw badRequest(ERROR_CODES.INVALID_CONFIG_TYPE, "Invalid config type");
  }

  const db = c.get("db");
  const table = getConfigTable(configType);
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
  const table = getConfigTable(configType);
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
  const table = getConfigTable(configType);
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
  const table = getConfigTable(configType);
  const id = c.req.param("id");

  await db.delete(table).where(eq(table.id, id));

  return c.json({ success: true });
});

export { accountConfigRoutes };
