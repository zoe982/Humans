import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source audit tests for NextActionSection.svelte.
 *
 * The component uses Svelte 5 runes, complex child components (SearchableSelect,
 * GlassDatePicker, Select.Root), and svelte-sonner toast — all of which require
 * DOM APIs that happy-dom cannot fully emulate. We therefore use source audits
 * (static analysis of the .svelte file) to verify the structural contracts of
 * the explicit-save refactor without mounting the component.
 *
 * These tests guard the following requirements from the explicit-save migration:
 *   - createAutoSaver is no longer imported (autosave removed)
 *   - onDestroy is no longer imported (no cleanup needed)
 *   - triggerNaSave is no longer present (removed)
 *   - saveNextAction async function is present
 *   - naSaving reactive state is declared
 *   - Save button rendered conditionally on naAllFilled
 *   - Save button is disabled while naSaving
 *   - Done button still present and calls handleComplete
 *   - Locked state still has Edit + Done buttons
 */

const COMPONENT_PATH = resolve(
  __dirname,
  "../../src/lib/components/NextActionSection.svelte",
);

const source = readFileSync(COMPONENT_PATH, "utf-8");

describe("NextActionSection.svelte — explicit-save source audit", () => {
  describe("autosave removal", () => {
    it("does not import createAutoSaver (autosave debounce removed)", () => {
      expect(source).not.toContain("createAutoSaver");
    });

    it("does not import onDestroy (no cleanup needed after removing naAutoSaver)", () => {
      expect(source).not.toContain("onDestroy");
    });

    it("does not contain triggerNaSave function", () => {
      expect(source).not.toContain("triggerNaSave");
    });

    it("does not contain naAutoSaver variable", () => {
      expect(source).not.toContain("naAutoSaver");
    });
  });

  describe("explicit save implementation", () => {
    it("declares naSaving reactive state", () => {
      expect(source).toContain("let naSaving = $state(false)");
    });

    it("declares saveNextAction async function", () => {
      expect(source).toContain("async function saveNextAction()");
    });

    it("saveNextAction guards on naAllFilled", () => {
      expect(source).toContain("if (!naAllFilled || naSaving) return");
    });

    it("saveNextAction sets naSaving = true before the PATCH", () => {
      // Verify naSaving is set to true before the api() call
      const fnStart = source.indexOf("async function saveNextAction()");
      const fnBody = source.slice(fnStart, fnStart + 600);
      const savingTruePos = fnBody.indexOf("naSaving = true");
      const apiCallPos = fnBody.indexOf("await api(apiEndpoint");
      expect(savingTruePos).toBeGreaterThan(-1);
      expect(apiCallPos).toBeGreaterThan(-1);
      expect(savingTruePos).toBeLessThan(apiCallPos);
    });

    it("saveNextAction sends all required fields in PATCH body", () => {
      expect(source).toContain("ownerId: naOwnerId");
      expect(source).toContain("description: naDescription");
      expect(source).toContain("type: naType");
      expect(source).toContain("dueDate: naDueDate");
      expect(source).toContain("cadenceNote: cadenceWarning() ? naCadenceNote : null");
    });

    it("saveNextAction locks the card on success (naLocked = true)", () => {
      const fnStart = source.indexOf("async function saveNextAction()");
      const fnEnd = source.indexOf("\n  }", fnStart) + 4;
      const fnBody = source.slice(fnStart, fnEnd);
      expect(fnBody).toContain("naLocked = true");
    });

    it("saveNextAction resets naSaving in finally block", () => {
      expect(source).toContain("finally {");
      // naSaving = false must appear inside a finally block
      const finallyIdx = source.indexOf("finally {");
      const afterFinally = source.slice(finallyIdx, finallyIdx + 60);
      expect(afterFinally).toContain("naSaving = false");
    });

    it("saveNextAction shows success toast on save", () => {
      const fnStart = source.indexOf("async function saveNextAction()");
      const fnEnd = source.indexOf("\n  }", fnStart) + 4;
      const fnBody = source.slice(fnStart, fnEnd);
      expect(fnBody).toContain('toast("Next action saved")');
    });

    it("saveNextAction shows error toast on failure", () => {
      const fnStart = source.indexOf("async function saveNextAction()");
      const fnEnd = source.indexOf("\n  }", fnStart) + 4;
      const fnBody = source.slice(fnStart, fnEnd);
      expect(fnBody).toContain("Next action save failed:");
    });
  });

  describe("Save button markup", () => {
    it("Save button calls saveNextAction on click", () => {
      expect(source).toContain("onclick={saveNextAction}");
    });

    it("Save button is conditionally rendered when naAllFilled", () => {
      expect(source).toContain("{#if naAllFilled}");
    });

    it("Save button is disabled while naSaving", () => {
      expect(source).toContain("disabled={naSaving}");
    });

    it("Save button label text is Save", () => {
      // The button contains a Check icon and Save text
      expect(source).toContain("Save\n");
    });

    it("Save button appears inside the {:else} branch (unlocked, not locked)", () => {
      // The structure must have {:else} followed by Save button (not {:else if naDescription})
      expect(source).not.toContain("{:else if naDescription}");
    });
  });

  describe("Done button markup", () => {
    it("Done button in unlocked form calls handleComplete", () => {
      // The unlocked Done button triggers handleComplete
      expect(source).toContain("onclick={handleComplete}");
    });

    it("Done button visible when naDescription is truthy", () => {
      expect(source).toContain("{#if naDescription}");
    });

    it("Done button in locked state calls handleComplete", () => {
      // locked Done button also calls handleComplete
      const lockedSection = source.slice(
        source.indexOf("{#if naLocked}"),
        source.indexOf("{:else}"),
      );
      expect(lockedSection).toContain("onclick={handleComplete}");
    });
  });

  describe("Locked state preservation", () => {
    it("Edit button still calls unlockNextAction in locked state", () => {
      const lockedSection = source.slice(
        source.indexOf("{#if naLocked}"),
        source.indexOf("{:else}"),
      );
      expect(lockedSection).toContain("onclick={unlockNextAction}");
    });

    it("SaveStatus type is still imported for SaveIndicator", () => {
      expect(source).toContain("SaveStatus");
    });

    it("SaveIndicator is still rendered in unlocked state", () => {
      expect(source).toContain("<SaveIndicator status={naSaveStatus} />");
    });
  });
});
