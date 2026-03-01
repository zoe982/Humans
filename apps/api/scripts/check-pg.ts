import postgres from "postgres";
import { readFileSync } from "node:fs";

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL, { connect_timeout: 10 });

async function main() {
  const [row] = await sql`SELECT version()`;
  console.log("Connected:", (row.version as string).split(",")[0]);

  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  console.log(`Existing tables: ${tables.length}`);

  if (tables.length > 0) {
    console.log("Tables:", tables.map((t) => t.tablename).join(", "));
  }

  // If no tables, apply baseline migration
  if (tables.length === 0) {
    const migrationFile = process.argv[2];
    if (migrationFile) {
      console.log(`\nApplying migration: ${migrationFile}`);
      const ddl = readFileSync(migrationFile, "utf-8");

      // Split on drizzle statement breakpoints
      const statements = ddl
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      console.log(`  ${statements.length} statements to execute`);

      for (const stmt of statements) {
        await sql.unsafe(stmt);
      }

      const tablesAfter = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
      console.log(`\nTables created: ${tablesAfter.length}`);
      console.log(tablesAfter.map((t) => t.tablename).sort().join(", "));
    } else {
      console.log("\nPass migration file as argument to apply schema:");
      console.log("  DATABASE_URL=... npx tsx scripts/check-pg.ts packages/db/drizzle/0000_opposite_bloodaxe.sql");
    }
  }

  await sql.end();
}

main().catch(async (err) => {
  console.error("Error:", err.message);
  await sql.end();
  process.exit(1);
});
