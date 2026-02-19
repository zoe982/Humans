/// <reference types="@cloudflare/vitest-pool-workers" />
import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@humans/db/schema";
import { buildColleague } from "@humans/test-utils";
import { SESSION_TTL_SECONDS } from "@humans/shared";
import type { Role } from "@humans/shared";

export function getDb() {
  return drizzle(env.DB, { schema });
}

export async function createUserAndSession(role: Role = "agent") {
  const db = getDb();
  const user = buildColleague({ role });
  await db.insert(schema.colleagues).values(user);

  const token = crypto.randomUUID();
  await env.SESSIONS.put(
    `session:${token}`,
    JSON.stringify({ colleagueId: user.id, email: user.email, role: user.role }),
    { expirationTtl: SESSION_TTL_SECONDS },
  );

  return { user, token };
}

export function sessionCookie(token: string): string {
  return `humans_session=${token}`;
}
