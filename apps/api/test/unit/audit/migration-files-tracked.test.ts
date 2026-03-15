import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Audit test: every migration file in packages/db/drizzle/ must be registered
 * in the schema_migrations tracking migration's backfill INSERT.
 *
 * This catches the case where someone creates a new migration file but forgets
 * to add it to the tracking backfill, which would cause deploy.sh to detect
 * a "pending" migration that was already applied.
 */

const DRIZZLE_DIR = path.resolve(__dirname, "../../../../../packages/db/drizzle");

function getMigrationFiles(): string[] {
	return fs
		.readdirSync(DRIZZLE_DIR)
		.filter((f) => f.endsWith(".sql") && !f.startsWith("meta"))
		.sort();
}

function getTrackingMigrationContent(): string {
	const files = getMigrationFiles();
	const trackingFile = files
		.reverse()
		.find((f) => f.includes("schema_migrations"));
	if (!trackingFile) {
		throw new Error(
			"No schema_migrations tracking migration found in packages/db/drizzle/",
		);
	}
	return fs.readFileSync(path.join(DRIZZLE_DIR, trackingFile), "utf-8");
}

describe("migration files tracked in schema_migrations", () => {
	it("every .sql file in drizzle/ is listed in the tracking migration backfill", () => {
		const migrationFiles = getMigrationFiles();
		const trackingContent = getTrackingMigrationContent();

		const untracked = migrationFiles.filter(
			(f) => !trackingContent.includes(`'${f}'`),
		);

		expect(untracked).toEqual([]);
	});

	it("tracking migration exists", () => {
		const files = getMigrationFiles();
		const hasTracking = files.some((f) => f.includes("schema_migrations"));
		expect(hasTracking).toBe(true);
	});
});
