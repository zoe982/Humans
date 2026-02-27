import { eq } from "drizzle-orm";
import { humans, accounts, generalLeads } from "@humans/db/schema";
import type { DB } from "../services/types";

export interface OwnerSummaryItem {
  type: string;
  id: string;
  displayId: string;
  name: string;
}

interface EntityWithOwners {
  humanId: string | null;
  accountId: string | null;
  generalLeadId: string | null;
}

export async function resolveOwnerSummary(
  db: DB,
  entity: EntityWithOwners,
): Promise<OwnerSummaryItem[]> {
  const owners: OwnerSummaryItem[] = [];

  if (entity.humanId != null) {
    const rows = await db
      .select({ id: humans.id, displayId: humans.displayId, firstName: humans.firstName, lastName: humans.lastName })
      .from(humans)
      .where(eq(humans.id, entity.humanId));
    const h = rows[0];
    if (h != null) {
      owners.push({ type: "human", id: h.id, displayId: h.displayId, name: `${h.firstName} ${h.lastName}` });
    }
  }

  if (entity.accountId != null) {
    const rows = await db
      .select({ id: accounts.id, displayId: accounts.displayId, name: accounts.name })
      .from(accounts)
      .where(eq(accounts.id, entity.accountId));
    const a = rows[0];
    if (a != null) {
      owners.push({ type: "account", id: a.id, displayId: a.displayId, name: a.name });
    }
  }

  if (entity.generalLeadId != null) {
    const rows = await db
      .select({ id: generalLeads.id, displayId: generalLeads.displayId, firstName: generalLeads.firstName, lastName: generalLeads.lastName })
      .from(generalLeads)
      .where(eq(generalLeads.id, entity.generalLeadId));
    const l = rows[0];
    if (l != null) {
      owners.push({ type: "generalLead", id: l.id, displayId: l.displayId, name: `${l.firstName} ${l.lastName}` });
    }
  }

  return owners;
}
