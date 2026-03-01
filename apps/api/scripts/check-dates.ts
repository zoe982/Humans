#!/usr/bin/env tsx
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL required"); process.exit(1); }
const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  // Activities
  const activities = await sql`SELECT display_id, activity_date, created_at, updated_at FROM activities ORDER BY display_id LIMIT 15`;
  console.log("=== Activities (first 15) ===");
  for (const r of activities) {
    console.log(`${r.display_id} | activity_date: ${r.activity_date} | created: ${r.created_at} | updated: ${r.updated_at}`);
  }

  // Compare with D1 source — check a few known rows
  console.log("\n=== Spot-check: ACT-AAA-001 vs D1 export ===");
  const [act1] = await sql`SELECT * FROM activities WHERE display_id = 'ACT-AAA-001'`;
  if (act1) {
    console.log("activity_date:", act1.activity_date);
    console.log("created_at:", act1.created_at);
    console.log("updated_at:", act1.updated_at);
    console.log("type:", act1.type);
    console.log("subject:", act1.subject);
  }

  // Humans
  const humans = await sql`SELECT display_id, created_at, updated_at FROM humans ORDER BY display_id LIMIT 5`;
  console.log("\n=== Humans (first 5) ===");
  for (const r of humans) console.log(`${r.display_id} | created: ${r.created_at} | updated: ${r.updated_at}`);

  // Accounts
  const accounts = await sql`SELECT display_id, created_at, updated_at FROM accounts ORDER BY display_id LIMIT 5`;
  console.log("\n=== Accounts (first 5) ===");
  for (const r of accounts) console.log(`${r.display_id} | created: ${r.created_at} | updated: ${r.updated_at}`);

  // Opportunities
  const opps = await sql`SELECT display_id, created_at, updated_at FROM opportunities ORDER BY display_id LIMIT 5`;
  console.log("\n=== Opportunities (first 5) ===");
  for (const r of opps) console.log(`${r.display_id} | created: ${r.created_at} | updated: ${r.updated_at}`);

  // Pets
  const pets = await sql`SELECT display_id, created_at, updated_at FROM pets ORDER BY display_id LIMIT 5`;
  console.log("\n=== Pets (first 5) ===");
  for (const r of pets) console.log(`${r.display_id} | created: ${r.created_at} | updated: ${r.updated_at}`);

  // Check for any NULL dates that shouldn't be null
  console.log("\n=== NULL date checks ===");
  const nullActivityDates = await sql`SELECT count(*)::int as c FROM activities WHERE activity_date IS NULL`;
  console.log("Activities with NULL activity_date:", nullActivityDates[0].c);
  const nullCreated = await sql`SELECT count(*)::int as c FROM activities WHERE created_at IS NULL`;
  console.log("Activities with NULL created_at:", nullCreated[0].c);
  const nullHumanDates = await sql`SELECT count(*)::int as c FROM humans WHERE created_at IS NULL`;
  console.log("Humans with NULL created_at:", nullHumanDates[0].c);

  // Check date format consistency
  console.log("\n=== Date format samples ===");
  const dateSamples = await sql`
    SELECT 'activities.activity_date' as field, activity_date as val FROM activities LIMIT 3
    UNION ALL
    SELECT 'activities.created_at', created_at FROM activities LIMIT 3
    UNION ALL
    SELECT 'humans.created_at', created_at FROM humans LIMIT 3
    UNION ALL
    SELECT 'front_sync_runs.started_at', started_at FROM front_sync_runs LIMIT 3
  `;
  for (const r of dateSamples) console.log(`${r.field}: ${r.val}`);

  // Check if any dates look wrong (e.g. epoch, year 1970, or far future)
  console.log("\n=== Suspicious dates ===");
  const suspicious = await sql`
    SELECT 'activities' as tbl, display_id, activity_date as dt FROM activities
    WHERE activity_date < '2020-01-01' OR activity_date > '2030-01-01'
    UNION ALL
    SELECT 'humans', display_id, created_at FROM humans
    WHERE created_at < '2020-01-01' OR created_at > '2030-01-01'
  `;
  if (suspicious.length === 0) console.log("None found — all dates in expected range");
  else for (const r of suspicious) console.log(`${r.tbl} ${r.display_id}: ${r.dt}`);

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
