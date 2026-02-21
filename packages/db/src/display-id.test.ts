import { describe, it, expect } from "vitest";
import {
  formatDisplayId,
  parseDisplayId,
  GREEK_ALPHABET,
} from "./display-id";

// Max valid counter: 24 letters * 999 numbers = 23976
const MAX_COUNTER = GREEK_ALPHABET.length * 999;

describe("formatDisplayId", () => {
  describe("boundary cases", () => {
    it("formats counter=1 as alpha-001", () => {
      expect(formatDisplayId("HUM", 1)).toBe("HUM-alpha-001");
    });

    it("formats counter=999 as alpha-999 (last in first letter)", () => {
      expect(formatDisplayId("HUM", 999)).toBe("HUM-alpha-999");
    });

    it("formats counter=1000 as beta-001 (first in second letter)", () => {
      expect(formatDisplayId("HUM", 1000)).toBe("HUM-beta-001");
    });

    it("formats counter=1998 as beta-999 (last in second letter)", () => {
      expect(formatDisplayId("HUM", 1998)).toBe("HUM-beta-999");
    });

    it("formats counter=1999 as gamma-001 (first in third letter)", () => {
      expect(formatDisplayId("HUM", 1999)).toBe("HUM-gamma-001");
    });

    it("formats counter=23976 as omega-999 (absolute maximum)", () => {
      expect(formatDisplayId("HUM", MAX_COUNTER)).toBe("HUM-omega-999");
    });

    it("formats counter=23977-999=22978 as omega-001 (first in last letter)", () => {
      // omega is letter index 23, so first omega counter = 23*999+1 = 22978
      expect(formatDisplayId("HUM", 22978)).toBe("HUM-omega-001");
    });
  });

  describe("number padding", () => {
    it("pads single-digit numbers with two leading zeros", () => {
      expect(formatDisplayId("HUM", 1)).toMatch(/-001$/);
    });

    it("pads two-digit numbers with one leading zero", () => {
      expect(formatDisplayId("HUM", 10)).toMatch(/-010$/);
    });

    it("does not pad three-digit numbers", () => {
      expect(formatDisplayId("HUM", 100)).toMatch(/-100$/);
    });
  });

  describe("prefix types", () => {
    it("works with HUM prefix", () => {
      expect(formatDisplayId("HUM", 1)).toBe("HUM-alpha-001");
    });

    it("works with ACC prefix", () => {
      expect(formatDisplayId("ACC", 1)).toBe("ACC-alpha-001");
    });

    it("works with ACT prefix", () => {
      expect(formatDisplayId("ACT", 500)).toBe("ACT-alpha-500");
    });

    it("works with PET prefix", () => {
      expect(formatDisplayId("PET", 1000)).toBe("PET-beta-001");
    });

    it("works with EML prefix", () => {
      expect(formatDisplayId("EML", 1)).toBe("EML-alpha-001");
    });

    it("works with FON prefix", () => {
      expect(formatDisplayId("FON", 23976)).toBe("FON-omega-999");
    });

    it("works with SOC prefix", () => {
      expect(formatDisplayId("SOC", 1)).toBe("SOC-alpha-001");
    });

    it("works with ERR prefix", () => {
      expect(formatDisplayId("ERR", 42)).toBe("ERR-alpha-042");
    });
  });

  describe("invalid counter values", () => {
    it("throws for counter=0", () => {
      expect(() => formatDisplayId("HUM", 0)).toThrowError(
        "Counter 0 out of range (1-23976)",
      );
    });

    it("throws for counter=-1", () => {
      expect(() => formatDisplayId("HUM", -1)).toThrowError(
        "Counter -1 out of range (1-23976)",
      );
    });

    it("throws for counter=-999 (large negative)", () => {
      expect(() => formatDisplayId("HUM", -999)).toThrowError(
        "Counter -999 out of range (1-23976)",
      );
    });

    it("throws for counter=23977 (one over max)", () => {
      expect(() => formatDisplayId("HUM", MAX_COUNTER + 1)).toThrowError(
        "Counter 23977 out of range (1-23976)",
      );
    });

    it("throws for counter=99999 (far over max)", () => {
      expect(() => formatDisplayId("HUM", 99999)).toThrowError(
        "Counter 99999 out of range (1-23976)",
      );
    });

    it("error message includes the correct max boundary", () => {
      expect(() => formatDisplayId("HUM", 0)).toThrowError(`1-${String(MAX_COUNTER)}`);
    });
  });

  describe("output format", () => {
    it("always produces three hyphen-separated parts", () => {
      const result = formatDisplayId("HUM", 500);
      expect(result.split("-")).toHaveLength(3);
    });

    it("first part is always the prefix", () => {
      expect(formatDisplayId("ACC", 1).split("-")[0]).toBe("ACC");
    });

    it("second part is always a valid Greek letter", () => {
      const letter = formatDisplayId("HUM", 1000).split("-")[1];
      expect(GREEK_ALPHABET).toContain(letter);
    });

    it("third part is always a 3-digit zero-padded string", () => {
      const numberPart = formatDisplayId("HUM", 5).split("-")[2];
      expect(numberPart).toMatch(/^\d{3}$/);
    });
  });
});

describe("parseDisplayId", () => {
  describe("round-trip with formatDisplayId", () => {
    it("round-trips counter=1", () => {
      const id = formatDisplayId("HUM", 1);
      const parsed = parseDisplayId(id);
      expect(parsed.counter).toBe(1);
      expect(parsed.prefix).toBe("HUM");
      expect(parsed.letter).toBe("alpha");
      expect(parsed.number).toBe(1);
    });

    it("round-trips counter=999 (last alpha)", () => {
      const id = formatDisplayId("HUM", 999);
      const parsed = parseDisplayId(id);
      expect(parsed.counter).toBe(999);
      expect(parsed.letter).toBe("alpha");
      expect(parsed.number).toBe(999);
    });

    it("round-trips counter=1000 (first beta)", () => {
      const id = formatDisplayId("HUM", 1000);
      const parsed = parseDisplayId(id);
      expect(parsed.counter).toBe(1000);
      expect(parsed.letter).toBe("beta");
      expect(parsed.number).toBe(1);
    });

    it("round-trips counter=23976 (last omega)", () => {
      const id = formatDisplayId("HUM", MAX_COUNTER);
      const parsed = parseDisplayId(id);
      expect(parsed.counter).toBe(MAX_COUNTER);
      expect(parsed.letter).toBe("omega");
      expect(parsed.number).toBe(999);
    });

    it("round-trips with ACC prefix", () => {
      const id = formatDisplayId("ACC", 500);
      const parsed = parseDisplayId(id);
      expect(parsed.counter).toBe(500);
      expect(parsed.prefix).toBe("ACC");
    });

    it("round-trips mid-range counter", () => {
      const id = formatDisplayId("PET", 5000);
      const parsed = parseDisplayId(id);
      expect(parsed.counter).toBe(5000);
      expect(parsed.prefix).toBe("PET");
    });

    it("round-trip preserves all four fields", () => {
      const counter = 1998;
      const id = formatDisplayId("ACT", counter);
      const parsed = parseDisplayId(id);
      expect(parsed.prefix).toBe("ACT");
      expect(parsed.letter).toBe("beta");
      expect(parsed.number).toBe(999);
      expect(parsed.counter).toBe(counter);
    });
  });

  describe("invalid format", () => {
    it("throws for too few parts (one segment)", () => {
      expect(() => parseDisplayId("HUM")).toThrowError(
        "Invalid display ID format: HUM",
      );
    });

    it("throws for too few parts (two segments)", () => {
      expect(() => parseDisplayId("HUM-alpha")).toThrowError(
        "Invalid display ID format: HUM-alpha",
      );
    });

    it("throws for too many parts (four segments)", () => {
      expect(() => parseDisplayId("HUM-alpha-001-extra")).toThrowError(
        "Invalid display ID format: HUM-alpha-001-extra",
      );
    });

    it("throws for empty string", () => {
      expect(() => parseDisplayId("")).toThrowError(
        "Invalid display ID format: ",
      );
    });

    it("throws for invalid Greek letter", () => {
      expect(() => parseDisplayId("HUM-notreal-001")).toThrowError(
        "Invalid Greek letter in display ID: notreal",
      );
    });

    it("throws for misspelled Greek letter", () => {
      expect(() => parseDisplayId("HUM-alph-001")).toThrowError(
        "Invalid Greek letter in display ID: alph",
      );
    });

    it("throws for empty letter segment", () => {
      expect(() => parseDisplayId("HUM--001")).toThrowError(
        "Invalid Greek letter in display ID: ",
      );
    });

    it("throws for number=0 (below valid range)", () => {
      expect(() => parseDisplayId("HUM-alpha-000")).toThrowError(
        "Invalid number in display ID: 000",
      );
    });

    it("throws for number=1000 (above valid range)", () => {
      expect(() => parseDisplayId("HUM-alpha-1000")).toThrowError(
        "Invalid number in display ID: 1000",
      );
    });

    it("throws for non-numeric number segment", () => {
      expect(() => parseDisplayId("HUM-alpha-abc")).toThrowError(
        "Invalid number in display ID: abc",
      );
    });
  });

  describe("returned structure", () => {
    it("returns prefix as string", () => {
      const parsed = parseDisplayId("HUM-alpha-001");
      expect(typeof parsed.prefix).toBe("string");
      expect(parsed.prefix).toBe("HUM");
    });

    it("returns letter as a valid Greek alphabet entry", () => {
      const parsed = parseDisplayId("HUM-gamma-050");
      expect(GREEK_ALPHABET).toContain(parsed.letter);
      expect(parsed.letter).toBe("gamma");
    });

    it("returns number as parsed integer (not string)", () => {
      const parsed = parseDisplayId("HUM-alpha-007");
      expect(typeof parsed.number).toBe("number");
      expect(parsed.number).toBe(7);
    });

    it("returns counter computed from letter index and number", () => {
      // gamma is index 2, number 50 → counter = 2*999 + 50 = 2048
      const parsed = parseDisplayId("HUM-gamma-050");
      expect(parsed.counter).toBe(2 * 999 + 50);
    });

    it("counter for alpha-001 is exactly 1", () => {
      const parsed = parseDisplayId("HUM-alpha-001");
      expect(parsed.counter).toBe(1);
    });

    it("counter for omega-999 is exactly 23976", () => {
      const parsed = parseDisplayId("HUM-omega-999");
      expect(parsed.counter).toBe(MAX_COUNTER);
    });
  });
});
