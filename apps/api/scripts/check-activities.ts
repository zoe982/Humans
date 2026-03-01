#!/usr/bin/env tsx
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL required"); process.exit(1); }
const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  console.log("=== Recent Activities (by activity_date DESC) ===");
  const rows = await sql`
    SELECT display_id, activity_date, created_at, colleague_id, type, direction, sync_run_id, subject
    FROM activities
    ORDER BY activity_date DESC
    LIMIT 15
  `;
  for (const r of rows) {
    console.log(JSON.stringify({
      id: r.display_id,
      activity_date: r.activity_date,
      created_at: r.created_at,
      colleague_id: r.colleague_id,
      type: r.type,
      dir: r.direction,
      synced: r.sync_run_id ? "yes" : "no",
      subject: (r.subject || "").substring(0, 60)
    }));
  }

  console.log("\n=== Colleagues ===");
  const cols = await sql`SELECT id, display_id, name, email FROM colleagues`;
  for (const r of cols) console.log(JSON.stringify(r));

  console.log("\n=== Activities with NULL colleague_id ===");
  const nc = await sql`SELECT count(*)::int as c FROM activities WHERE colleague_id IS NULL`;
  const tc = await sql`SELECT count(*)::int as c FROM activities`;
  console.log("NULL colleague:", nc[0].c, "/ total:", tc[0].c);

  console.log("\n=== Activities with sync_run_id (from Front) with NULL colleague ===");
  const fns = await sql`
    SELECT count(*)::int as c FROM activities
    WHERE sync_run_id IS NOT NULL AND colleague_id IS NULL
  `;
  const fts = await sql`
    SELECT count(*)::int as c FROM activities
    WHERE sync_run_id IS NOT NULL
  `;
  console.log("Front-synced with NULL colleague:", fns[0].c, "/ total Front-synced:", fts[0].c);

  console.log("\n=== Sample: Front-synced activities with NULL colleague ===");
  const samples = await sql`
    SELECT display_id, activity_date, created_at, type, direction, subject
    FROM activities
    WHERE sync_run_id IS NOT NULL AND colleague_id IS NULL
    ORDER BY activity_date DESC
    LIMIT 10
  `;
  for (const r of samples) {
    console.log(JSON.stringify({
      id: r.display_id,
      activity_date: r.activity_date,
      created_at: r.created_at,
      type: r.type,
      dir: r.direction,
      subject: (r.subject || "").substring(0, 50)
    }));
  }

  console.log("\n=== Activity date distribution ===");
  const dist = await sql`
    SELECT DATE(activity_date) as dt, count(*)::int as c
    FROM activities
    GROUP BY DATE(activity_date)
    ORDER BY dt DESC
    LIMIT 20
  `;
  for (const r of dist) console.log(`${r.dt}: ${r.c} activities`);

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
