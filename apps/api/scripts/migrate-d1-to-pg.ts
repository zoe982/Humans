#!/usr/bin/env tsx
/**
 * D1 (SQLite) → Cloud SQL (PostgreSQL) data migration script.
 *
 * Usage:
 *   1. Export D1 data:
 *      wrangler d1 export humans-db --remote --output=d1-export.sql --config apps/api/wrangler.toml
 *
 *   2. Set DATABASE_URL to your Cloud SQL connection string:
 *      export DATABASE_URL="postgresql://humans_app:<password>@34.65.161.108:5432/humans"
 *
 *   3. Run from apps/api (where postgres is installed):
 *      cd apps/api && npx tsx scripts/migrate-d1-to-pg.ts ../../d1-export.sql
 */

import postgres from "postgres";
import { readFileSync } from "node:fs";

// ─── Configuration ────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

const exportFile = process.argv[2];
if (!exportFile) {
  console.error("Usage: npx tsx scripts/migrate-d1-to-pg.ts <d1-export.sql>");
  process.exit(1);
}

// Boolean columns by table — store 0/1 in D1, need true/false in PG
const BOOLEAN_COLUMNS: Record<string, Set<string>> = {
  colleagues: new Set(["is_active"]),
  emails: new Set(["is_primary"]),
  phones: new Set(["has_whatsapp", "is_primary"]),
  pets: new Set(["is_active"]),
  lead_sources: new Set(["is_active"]),
  referral_codes: new Set(["is_active"]),
  lead_scores: new Set([
    "fit_matches_current_website_flight",
    "fit_price_acknowledged_ok",
    "intent_deposit_paid",
    "intent_payment_details_sent",
    "intent_requested_payment_details",
    "intent_booking_submitted",
    "intent_booking_started",
    "intent_route_signup_submitted",
    "engagement_responded_fast",
    "engagement_responded_slow",
    "negative_no_contact_method",
    "negative_off_network_request",
    "negative_price_objection",
    "negative_ghosted_after_payment_sent",
    "customer_has_flown",
  ]),
};

// JSON columns — stored as text in D1, need JSONB in PG
const JSON_COLUMNS: Record<string, Set<string>> = {
  audit_log: new Set(["changes"]),
  error_log: new Set(["details"]),
  lead_events: new Set(["metadata"]),
};

// Table insertion order (parents before children for FK safety)
const TABLE_ORDER = [
  "display_id_counters",
  "colleagues",
  "humans",
  "accounts",
  "lead_sources",
  "error_log",
  "geo_interests",
  "account_types_config",
  "account_human_labels_config",
  "email_labels_config",
  "phone_labels_config",
  "account_email_labels_config",
  "account_phone_labels_config",
  "human_email_labels_config",
  "human_phone_labels_config",
  "social_id_platforms_config",
  "lead_sources_config",
  "lead_channels_config",
  "loss_reasons_config",
  "human_relationship_labels_config",
  "opportunity_human_roles_config",
  "opportunity_stage_cadence_config",
  "agreement_types_config",
  "emails",
  "phones",
  "human_types",
  "human_route_signups",
  "pets",
  "lead_events",
  "audit_log",
  "account_types",
  "account_humans",
  "front_sync_runs",
  "general_leads",
  "lead_scores",
  "opportunities",
  "human_website_booking_requests",
  "activities",
  "geo_interest_expressions",
  "route_interests",
  "route_interest_expressions",
  "social_ids",
  "websites",
  "referral_codes",
  "opportunity_humans",
  "opportunity_pets",
  "activity_opportunities",
  "entity_next_actions",
  "agreements",
  "documents",
  "human_relationships",
];

// ─── Parser ──────────────────────────────────────────────────────────────────

function parseCreateTables(sql: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  // Handle both "CREATE TABLE name" and "CREATE TABLE IF NOT EXISTS name"
  const createRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(([\s\S]*?)\);/gi;

  // Only filter words that could appear before a type keyword in constraint syntax.
  // The column regex already requires a SQL type (text|integer|...) to follow,
  // so most SQL keywords are naturally excluded. This set catches edge cases only.
  const SQL_KEYWORDS = new Set([
    "FOREIGN", "PRIMARY", "UNIQUE", "CHECK", "CONSTRAINT",
    "REFERENCES", "DEFAULT", "NOT", "ON",
    "SET", "NO", "CASCADE", "RESTRICT", "NULL",
    "IF", "EXISTS", "TABLE", "CREATE",
  ]);

  let match;
  while ((match = createRegex.exec(sql)) !== null) {
    const tableName = match[1]!;
    const body = match[2]!;
    const columns: string[] = [];

    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("FOREIGN KEY") ||
        trimmed.startsWith("PRIMARY KEY") ||
        trimmed.startsWith("UNIQUE") ||
        trimmed.startsWith("CHECK") ||
        trimmed.startsWith("CONSTRAINT") ||
        trimmed === ""
      ) {
        continue;
      }
      // Match ALL column definitions on this line.
      // Handles: single column per line, multiple columns per line (ALTER TABLE additions),
      // and trailing columns on the closing paren line.
      const colRegex = /,?\s*[`"]?(\w+)[`"]?\s+(?:text|integer|real|boolean|blob)\b/gi;
      let colMatch;
      while ((colMatch = colRegex.exec(trimmed)) !== null) {
        const colName = colMatch[1]!;
        if (!SQL_KEYWORDS.has(colName.toUpperCase())) {
          columns.push(colName);
        }
      }
    }

    if (columns.length > 0) {
      result.set(tableName, columns);
    }
  }

  return result;
}

interface ParsedRow {
  table: string;
  values: (string | number | null)[];
}

function parseInsertLines(sql: string): ParsedRow[] {
  const results: ParsedRow[] = [];
  const lines = sql.split("\n");

  for (const line of lines) {
    if (!line.startsWith("INSERT INTO")) continue;

    const match = line.match(
      /^INSERT\s+INTO\s+[`"]?(\w+)[`"]?\s+VALUES\s*\((.+)\)\s*;?\s*$/i,
    );
    if (!match) continue;

    const table = match[1]!;
    const valuesStr = match[2]!;
    const values = parseValues(valuesStr);

    results.push({ table, values });
  }

  return results;
}

function parseSqlString(str: string, start: number): { value: string; end: number } {
  let value = "";
  let i = start + 1; // skip opening quote
  while (i < str.length) {
    if (str[i] === "'" && str[i + 1] === "'") {
      value += "'";
      i += 2;
    } else if (str[i] === "'") {
      i++;
      break;
    } else {
      value += str[i];
      i++;
    }
  }
  return { value, end: i };
}

// Parse replace('text', '\r', char(13)) or nested replace(replace(...), ...)
// Returns the evaluated string with replacements applied
function parseReplace(str: string, start: number): { value: string; end: number } {
  let i = start + 8; // skip "replace("
  while (i < str.length && str[i] === " ") i++;

  // First argument: either a nested replace() or a string literal
  let innerValue: string;
  if (str.substring(i, i + 8).toLowerCase() === "replace(") {
    const inner = parseReplace(str, i);
    innerValue = inner.value;
    i = inner.end;
  } else if (str[i] === "'") {
    const parsed = parseSqlString(str, i);
    innerValue = parsed.value;
    i = parsed.end;
  } else {
    // Unexpected format — skip to matching close paren
    let depth = 1;
    while (i < str.length && depth > 0) {
      if (str[i] === "(") depth++;
      else if (str[i] === ")") depth--;
      if (depth > 0) i++;
    }
    return { value: "", end: i + 1 };
  }

  // Second argument: the search string (e.g., '\n' or '\r')
  while (i < str.length && (str[i] === "," || str[i] === " ")) i++;
  let search = "";
  if (str[i] === "'") {
    const parsed = parseSqlString(str, i);
    search = parsed.value;
    i = parsed.end;
  }

  // Third argument: the replacement — char(N) or a string
  while (i < str.length && (str[i] === "," || str[i] === " ")) i++;
  let replacement = "";
  if (str.substring(i, i + 5).toLowerCase() === "char(") {
    const closeIdx = str.indexOf(")", i + 5);
    const charCode = parseInt(str.substring(i + 5, closeIdx), 10);
    replacement = String.fromCharCode(charCode);
    i = closeIdx + 1;
  } else if (str[i] === "'") {
    const parsed = parseSqlString(str, i);
    replacement = parsed.value;
    i = parsed.end;
  }

  // Skip closing paren of replace()
  while (i < str.length && str[i] !== ")") i++;
  i++; // skip )

  // Apply the replacement
  const result = innerValue.split(search).join(replacement);
  return { value: result, end: i };
}

function parseValues(str: string): (string | number | null)[] {
  const values: (string | number | null)[] = [];
  let i = 0;

  while (i < str.length) {
    while (i < str.length && str[i] === " ") i++;
    if (i >= str.length) break;

    if (str[i] === ",") {
      i++;
      continue;
    }

    // Handle replace(...) — D1 uses replace('text', '\n', char(10)) for newlines
    // Also handles nested: replace(replace('text', '\r', char(13)), '\n', char(10))
    if (str.substring(i, i + 8).toLowerCase() === "replace(") {
      const { value, end } = parseReplace(str, i);
      i = end;
      values.push(value);
    } else if (str[i] === "'") {
      const { value, end } = parseSqlString(str, i);
      i = end;
      values.push(value);
    } else if (str.substring(i, i + 4).toUpperCase() === "NULL") {
      values.push(null);
      i += 4;
    } else if (str[i] === "X" && str[i + 1] === "'") {
      const endQuote = str.indexOf("'", i + 2);
      i = endQuote + 1;
      values.push(null);
    } else {
      let numStr = "";
      while (i < str.length && str[i] !== "," && str[i] !== " ") {
        numStr += str[i];
        i++;
      }
      const num = Number(numStr);
      values.push(Number.isNaN(num) ? numStr : num);
    }
  }

  return values;
}

// ─── Transform ────────────────────────────────────────────────────────────────

function transformRow(
  table: string,
  columns: string[],
  row: (string | number | null)[],
): (string | number | boolean | null)[] {
  const boolCols = BOOLEAN_COLUMNS[table];
  const jsonCols = JSON_COLUMNS[table];

  return row.map((value, idx) => {
    const col = columns[idx];
    if (!col) return value;

    if (boolCols?.has(col)) {
      if (value === 0 || value === "0") return false;
      if (value === 1 || value === "1") return true;
      if (value === null) return null;
      return Boolean(value);
    }

    if (jsonCols?.has(col) && typeof value === "string") {
      try {
        JSON.parse(value);
      } catch {
        console.warn(`  Warning: invalid JSON in ${table}.${col}`);
      }
    }

    return value;
  }) as (string | number | boolean | null)[];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("D1 → PostgreSQL Data Migration");
  console.log("================================\n");

  console.log(`Reading export file: ${exportFile}`);
  const sqlContent = readFileSync(exportFile!, "utf-8");
  console.log(`  File size: ${(sqlContent.length / 1024 / 1024).toFixed(1)} MB\n`);

  console.log("Parsing CREATE TABLE statements...");
  const tableColumns = parseCreateTables(sqlContent);
  console.log(`  Found ${tableColumns.size} table schemas\n`);

  console.log("Parsing INSERT statements...");
  const rows = parseInsertLines(sqlContent);
  console.log(`  Found ${rows.length} rows\n`);

  const byTable = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    const existing = byTable.get(row.table) ?? [];
    existing.push(row);
    byTable.set(row.table, existing);
  }

  console.log("Tables with data:");
  for (const [table, tableRows] of byTable) {
    const cols = tableColumns.get(table);
    console.log(`  ${table}: ${tableRows.length} rows (${cols?.length ?? "?"} cols)`);
  }
  console.log();

  console.log("Connecting to PostgreSQL...");
  const pg = postgres(DATABASE_URL!, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    const [{ version }] = await pg`SELECT version()`;
    console.log(`  Connected: ${(version as string).split(",")[0]}\n`);

    // Truncate all tables first (in case of re-run)
    console.log("Truncating all tables...");
    const allTables = [...TABLE_ORDER].reverse();
    for (const table of allTables) {
      try {
        await pg.unsafe(`TRUNCATE "${table}" CASCADE`);
      } catch {
        // Table may not exist in PG (e.g. referral_codes was dropped)
      }
    }
    console.log("  Done\n");

    // Fetch PG column types for explicit casts (avoids "could not determine data type" for NULLs)
    console.log("Fetching PG column types...");
    const pgColTypes = new Map<string, Map<string, string>>();
    const colTypeRows = await pg`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `;
    for (const row of colTypeRows) {
      const tbl = row.table_name as string;
      if (!pgColTypes.has(tbl)) pgColTypes.set(tbl, new Map());
      pgColTypes.get(tbl)!.set(row.column_name as string, row.data_type as string);
    }
    console.log(`  ${pgColTypes.size} tables\n`);

    console.log("Importing data (FK-ordered)...\n");
    const rowCounts: Record<string, number> = {};

    for (const table of TABLE_ORDER) {
      const tableRows = byTable.get(table);
      const columns = tableColumns.get(table);

      if (!tableRows || tableRows.length === 0) {
        rowCounts[table] = 0;
        continue;
      }

      if (!columns) {
        console.warn(`  ${table}: SKIPPED — no column schema found`);
        rowCounts[table] = 0;
        continue;
      }

      // Build type cast map for this table — skip if table doesn't exist in PG
      const pgTypes = pgColTypes.get(table);
      if (!pgTypes) {
        console.warn(`  ${table}: SKIPPED — table not in PG`);
        rowCounts[table] = 0;
        continue;
      }
      const pgTypeCast = (col: string): string => {
        const dt = pgTypes?.get(col);
        if (!dt) return "";
        if (dt === "text" || dt === "character varying") return "::text";
        if (dt === "integer") return "::integer";
        if (dt === "boolean") return "::boolean";
        if (dt === "jsonb") return "::jsonb";
        if (dt === "real" || dt === "double precision") return "::real";
        return "::text";
      };

      // Filter columns to only those that exist in PG
      const validColumns = columns.filter((c) => pgTypes?.has(c));
      const validIndices = validColumns.map((c) => columns.indexOf(c));

      let imported = 0;
      for (const row of tableRows) {
        // Only include values for columns that exist in PG
        const filteredValues = validIndices.map((idx) => row.values[idx] ?? null);
        const transformed = transformRow(table, validColumns, filteredValues);

        const colList = validColumns.map((c) => `"${c}"`).join(", ");
        const placeholders = validColumns
          .map((c, idx) => `$${idx + 1}${pgTypeCast(c)}`)
          .join(", ");
        const query = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

        await pg.unsafe(query, transformed);
        imported++;
      }

      console.log(`  ${table}: ${imported} rows`);
      rowCounts[table] = imported;
    }

    for (const [table] of byTable) {
      if (!TABLE_ORDER.includes(table)) {
        console.warn(`  WARNING: ${table} in export but not in TABLE_ORDER — skipped!`);
      }
    }

    console.log("\n================================");
    console.log("Verification\n");

    let allGood = true;
    for (const table of TABLE_ORDER) {
      const expected = rowCounts[table] ?? 0;
      if (expected === 0) continue;

      const [{ count }] = await pg.unsafe(
        `SELECT count(*)::int as count FROM "${table}"`,
      );
      const actual = count as number;

      if (actual >= expected) {
        console.log(`  ✓ ${table}: ${actual} rows`);
      } else {
        console.log(`  ✗ ${table}: expected ${expected}, got ${actual}`);
        allGood = false;
      }
    }

    console.log();
    if (allGood) {
      console.log("Migration completed successfully!");
    } else {
      console.log("WARNING: Some tables have fewer rows than expected.");
    }
  } finally {
    await pg.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
