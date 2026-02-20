import { Hono } from "hono";
import {
  createAccountSchema,
  updateAccountSchema,
  updateAccountStatusSchema,
  createAccountEmailSchema,
  createAccountPhoneNumberSchema,
  linkAccountHumanSchema,
  updateAccountHumanSchema,
} from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listAccounts,
  getAccountDetail,
  createAccount,
  updateAccount,
  updateAccountStatus,
  deleteAccount,
  addAccountEmail,
  deleteAccountEmail,
  addAccountPhone,
  deleteAccountPhone,
  linkAccountHuman,
  updateAccountHumanLabel,
  unlinkAccountHuman,
} from "../services/accounts";
import type { AppContext } from "../types";

const accountRoutes = new Hono<AppContext>();

accountRoutes.use("/*", authMiddleware);

// List all accounts with types
accountRoutes.get("/api/accounts", requirePermission("viewRecords"), async (c) => {
  const result = await listAccounts(c.get("db"));
  return c.json(result);
});

// Get single account with full detail
accountRoutes.get("/api/accounts/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getAccountDetail(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// Create account
accountRoutes.post("/api/accounts", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createAccountSchema.parse(body);
  const result = await createAccount(c.get("db"), data);
  return c.json({ data: result }, 201);
});

// Update account
accountRoutes.patch("/api/accounts/:id", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateAccountSchema.parse(body);
  const session = c.get("session")!;
  const result = await updateAccount(c.get("db"), c.req.param("id"), data, session.colleagueId);
  return c.json(result);
});

// Update account status
accountRoutes.patch("/api/accounts/:id/status", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateAccountStatusSchema.parse(body);
  const session = c.get("session")!;
  const result = await updateAccountStatus(c.get("db"), c.req.param("id"), data.status, session.colleagueId);
  return c.json({ data: { id: result.id, status: result.status }, auditEntryId: result.auditEntryId });
});

// Delete account + cascade
accountRoutes.delete("/api/accounts/:id", requirePermission("deleteAccounts"), async (c) => {
  await deleteAccount(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

// Add email to account
accountRoutes.post("/api/accounts/:id/emails", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createAccountEmailSchema.parse(body);
  const result = await addAccountEmail(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result }, 201);
});

// Delete account email
accountRoutes.delete("/api/accounts/:id/emails/:emailId", requirePermission("manageAccounts"), async (c) => {
  await deleteAccountEmail(c.get("db"), c.req.param("emailId"));
  return c.json({ success: true });
});

// Add phone number to account
accountRoutes.post("/api/accounts/:id/phone-numbers", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createAccountPhoneNumberSchema.parse(body);
  const result = await addAccountPhone(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result }, 201);
});

// Delete account phone number
accountRoutes.delete("/api/accounts/:id/phone-numbers/:phoneId", requirePermission("manageAccounts"), async (c) => {
  await deleteAccountPhone(c.get("db"), c.req.param("phoneId"));
  return c.json({ success: true });
});

// Link human to account
accountRoutes.post("/api/accounts/:id/humans", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = linkAccountHumanSchema.parse(body);
  const result = await linkAccountHuman(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result }, 201);
});

// Update human-account link label
accountRoutes.patch("/api/accounts/:id/humans/:linkId", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateAccountHumanSchema.parse(body);
  await updateAccountHumanLabel(c.get("db"), c.req.param("linkId"), data.labelId ?? null);
  return c.json({ success: true });
});

// Unlink human from account
accountRoutes.delete("/api/accounts/:id/humans/:linkId", requirePermission("manageAccounts"), async (c) => {
  await unlinkAccountHuman(c.get("db"), c.req.param("linkId"));
  return c.json({ success: true });
});

export { accountRoutes };
