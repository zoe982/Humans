// One-off script: bulk sync all Front conversations to Humans CRM
// Usage: node bulk-front-sync.mjs <session_token>
//
// Get your session token from browser:
//   DevTools → Application → Cookies → humans_session

const API_URL = "https://api.humans.pavinfo.app";
const SESSION_TOKEN = process.argv[2];

if (!SESSION_TOKEN) {
  console.log("Usage: node bulk-front-sync.mjs <session_token>");
  console.log(
    "Get your session token: browser DevTools → Application → Cookies → humans_session",
  );
  process.exit(1);
}

let cursor = null;
let syncRunId = null;
let page = 0;
let totalImported = 0;
let totalSkipped = 0;
let totalUnmatched = 0;
let totalErrors = 0;

console.log("Starting bulk Front sync...\n");

while (true) {
  page++;
  const params = new URLSearchParams({ limit: "20" });
  if (cursor) params.set("cursor", cursor);
  if (syncRunId) params.set("syncRunId", syncRunId);

  process.stdout.write(`Page ${page}: fetching...`);

  let res;
  try {
    res = await fetch(`${API_URL}/api/admin/front/sync?${params}`, {
      method: "POST",
      headers: { Cookie: `humans_session=${SESSION_TOKEN}` },
    });
  } catch (err) {
    console.error(`\n  Network error: ${err.message}`);
    console.log("  Re-run the script to resume (already-synced records are skipped).");
    process.exit(1);
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`\n  HTTP ${res.status}: ${text}`);
    if (res.status === 401 || res.status === 403) {
      console.log("  Session expired. Get a fresh token and re-run.");
    } else {
      console.log("  Re-run the script to resume (already-synced records are skipped).");
    }
    process.exit(1);
  }

  const json = await res.json();
  const data = json.data;

  syncRunId = data.syncRunId;
  totalImported += data.imported;
  totalSkipped += data.skipped;
  totalUnmatched += data.unmatched;
  totalErrors += data.errors.length;

  console.log(
    ` +${data.imported} imported, ${data.skipped} skipped, ${data.unmatched} unmatched` +
      (data.errors.length ? `, ${data.errors.length} errors` : ""),
  );
  console.log(
    `  Totals: ${totalImported} imported | ${totalSkipped} skipped | ${totalUnmatched} unmatched | ${totalErrors} errors`,
  );

  if (data.errors.length > 0) {
    for (const err of data.errors) {
      console.log(`  Error: ${err}`);
    }
  }

  if (!data.nextCursor) {
    console.log("\nDone! All conversations processed.");
    console.log(`Sync Run ID: ${syncRunId}`);
    console.log(
      `Final: ${totalImported} imported | ${totalSkipped} skipped | ${totalUnmatched} unmatched | ${totalErrors} errors`,
    );
    break;
  }

  cursor = data.nextCursor;

  // 2s delay between pages to respect Front API rate limits
  await new Promise((r) => setTimeout(r, 2000));
}
