import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { generalLeadStatuses } from "@humans/shared";

/**
 * Audit test: the general leads status filter dropdown must include all valid
 * statuses defined in the schema. BUG-013 discovered that "pending_response"
 * was missing and "closed_rejected" (an invalid status) was present.
 */

const PAGE_PATH = path.resolve(
  __dirname,
  "../../../../src/routes/leads/general-leads/+page.svelte",
);

function extractSelectOptions(source: string): { value: string; label: string }[] {
  // Find the <select id="status"> block
  const selectMatch = source.match(
    /<select\s+id="status"[^>]*>([\s\S]*?)<\/select>/,
  );
  if (!selectMatch) return [];

  const optionRegex = /<option\s+value="([^"]*)">(.*?)<\/option>/g;
  const options: { value: string; label: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = optionRegex.exec(selectMatch[1])) !== null) {
    options.push({ value: match[1], label: match[2] });
  }
  return options;
}

describe("General Leads status filter audit", () => {
  const source = fs.readFileSync(PAGE_PATH, "utf-8");
  const options = extractSelectOptions(source);

  it("has an 'All' option with empty value", () => {
    expect(options[0]).toEqual({ value: "", label: "All" });
  });

  it("includes every valid generalLeadStatus from the schema", () => {
    const filterValues = options.map((o) => o.value).filter((v) => v !== "");
    for (const status of generalLeadStatuses) {
      expect(filterValues).toContain(status);
    }
  });

  it("does not include invalid statuses", () => {
    const filterValues = options.map((o) => o.value);
    expect(filterValues).not.toContain("closed_rejected");
  });

  it("uses correct labels matching generalLeadStatusLabels", () => {
    const expectedOptions = [
      { value: "", label: "All" },
      { value: "open", label: "Open" },
      { value: "pending_response", label: "Pending Response" },
      { value: "qualified", label: "Qualified" },
      { value: "closed_lost", label: "Closed - Lost" },
      { value: "closed_converted", label: "Closed - Converted" },
    ];
    expect(options).toEqual(expectedOptions);
  });
});
