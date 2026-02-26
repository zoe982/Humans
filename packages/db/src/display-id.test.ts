import { describe, it, expect } from "vitest";
import { formatDisplayId, parseDisplayId } from "./display-id";

// Max valid counter: 26^3 * 999 = 17,558,424
const MAX_COUNTER = 26 ** 3 * 999;

describe("formatDisplayId", () => {
  describe("boundary cases", () => {
    it("formats counter=1 as AAA-001", () => {
      expect(formatDisplayId("HUM", 1)).toBe("HUM-AAA-001");
    });

    it("formats counter=999 as AAA-999 (last in first block)", () => {
      expect(formatDisplayId("HUM", 999)).toBe("HUM-AAA-999");
    });

    it("formats counter=1000 as AAB-001 (first in second block)", () => {
      expect(formatDisplayId("HUM", 1000)).toBe("HUM-AAB-001");
    });

    it("formats counter=1998 as AAB-999 (last in second block)", () => {
      expect(formatDisplayId("HUM", 1998)).toBe("HUM-AAB-999");
    });

    it("formats counter=1999 as AAC-001 (first in third block)", () => {
      expect(formatDisplayId("HUM", 1999)).toBe("HUM-AAC-001");
    });

    it("formats counter=25974 (26*999) as AAZ-999 (last in AAZ)", () => {
      expect(formatDisplayId("HUM", 25974)).toBe("HUM-AAZ-999");
    });

    it("formats counter=25975 as ABA-001 (first in ABA)", () => {
      expect(formatDisplayId("HUM", 25975)).toBe("HUM-ABA-001");
    });

    it("formats counter=675324 (676*999) as AZZ-999 (last in AZZ)", () => {
      expect(formatDisplayId("HUM", 675324)).toBe("HUM-AZZ-999");
    });

    it("formats counter=675325 as BAA-001 (first in BAA)", () => {
      expect(formatDisplayId("HUM", 675325)).toBe("HUM-BAA-001");
    });

    it("formats counter=17558424 as ZZZ-999 (absolute maximum)", () => {
      expect(formatDisplayId("HUM", MAX_COUNTER)).toBe("HUM-ZZZ-999");
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
      expect(formatDisplayId("HUM", 1)).toBe("HUM-AAA-001");
    });

    it("works with ACC prefix", () => {
      expect(formatDisplayId("ACC", 1)).toBe("ACC-AAA-001");
    });

    it("works with ACT prefix", () => {
      expect(formatDisplayId("ACT", 500)).toBe("ACT-AAA-500");
    });

    it("works with PET prefix", () => {
      expect(formatDisplayId("PET", 1000)).toBe("PET-AAB-001");
    });

    it("works with EML prefix", () => {
      expect(formatDisplayId("EML", 1)).toBe("EML-AAA-001");
    });

    it("works with FON prefix", () => {
      expect(formatDisplayId("FON", MAX_COUNTER)).toBe("FON-ZZZ-999");
    });

    it("works with SOC prefix", () => {
      expect(formatDisplayId("SOC", 1)).toBe("SOC-AAA-001");
    });

    it("works with ERR prefix", () => {
      expect(formatDisplayId("ERR", 42)).toBe("ERR-AAA-042");
    });

    it("works with MAT prefix", () => {
      expect(formatDisplayId("MAT", 1)).toBe("MAT-AAA-001");
    });
  });

  describe("invalid counter values", () => {
    it("throws for counter=0", () => {
      expect(() => formatDisplayId("HUM", 0)).toThrowError(
        "Counter 0 out of range (1-17558424)",
      );
    });

    it("throws for counter=-1", () => {
      expect(() => formatDisplayId("HUM", -1)).toThrowError(
        "Counter -1 out of range (1-17558424)",
      );
    });

    it("throws for counter=-999 (large negative)", () => {
      expect(() => formatDisplayId("HUM", -999)).toThrowError(
        "Counter -999 out of range (1-17558424)",
      );
    });

    it("throws for counter one over max", () => {
      expect(() => formatDisplayId("HUM", MAX_COUNTER + 1)).toThrowError(
        "Counter 17558425 out of range (1-17558424)",
      );
    });

    it("throws for counter=99999999 (far over max)", () => {
      expect(() => formatDisplayId("HUM", 99999999)).toThrowError(
        "Counter 99999999 out of range (1-17558424)",
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

    it("second part is always 3 uppercase letters", () => {
      const letters = formatDisplayId("HUM", 1000).split("-")[1];
      expect(letters).toMatch(/^[A-Z]{3}$/);
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
      expect(parsed.letters).toBe("AAA");
      expect(parsed.number).toBe(1);
    });

    it("round-trips counter=999 (last AAA)", () => {
      const id = formatDisplayId("HUM", 999);
      const parsed = parseDisplayId(id);
      expect(parsed.counter).toBe(999);
      expect(parsed.letters).toBe("AAA");
      expect(parsed.number).toBe(999);
    });

    it("round-trips counter=1000 (first AAB)", () => {
      const id = formatDisplayId("HUM", 1000);
      const parsed = parseDisplayId(id);
      expect(parsed.counter).toBe(1000);
      expect(parsed.letters).toBe("AAB");
      expect(parsed.number).toBe(1);
    });

    it("round-trips counter=17558424 (last ZZZ)", () => {
      const id = formatDisplayId("HUM", MAX_COUNTER);
      const parsed = parseDisplayId(id);
      expect(parsed.counter).toBe(MAX_COUNTER);
      expect(parsed.letters).toBe("ZZZ");
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
      expect(parsed.letters).toBe("AAB");
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
      expect(() => parseDisplayId("HUM-AAA")).toThrowError(
        "Invalid display ID format: HUM-AAA",
      );
    });

    it("throws for too many parts (four segments)", () => {
      expect(() => parseDisplayId("HUM-AAA-001-extra")).toThrowError(
        "Invalid display ID format: HUM-AAA-001-extra",
      );
    });

    it("throws for empty string", () => {
      expect(() => parseDisplayId("")).toThrowError(
        "Invalid display ID format: ",
      );
    });

    it("throws for invalid letter block (lowercase)", () => {
      expect(() => parseDisplayId("HUM-aaa-001")).toThrowError(
        "Invalid letter block in display ID: aaa",
      );
    });

    it("throws for invalid letter block (wrong length)", () => {
      expect(() => parseDisplayId("HUM-AB-001")).toThrowError(
        "Invalid letter block in display ID: AB",
      );
    });

    it("throws for empty letter segment", () => {
      expect(() => parseDisplayId("HUM--001")).toThrowError(
        "Invalid letter block in display ID: ",
      );
    });

    it("throws for number=0 (below valid range)", () => {
      expect(() => parseDisplayId("HUM-AAA-000")).toThrowError(
        "Invalid number in display ID: 000",
      );
    });

    it("throws for number=1000 (above valid range)", () => {
      expect(() => parseDisplayId("HUM-AAA-1000")).toThrowError(
        "Invalid number in display ID: 1000",
      );
    });

    it("throws for non-numeric number segment", () => {
      expect(() => parseDisplayId("HUM-AAA-abc")).toThrowError(
        "Invalid number in display ID: abc",
      );
    });
  });

  describe("returned structure", () => {
    it("returns prefix as string", () => {
      const parsed = parseDisplayId("HUM-AAA-001");
      expect(typeof parsed.prefix).toBe("string");
      expect(parsed.prefix).toBe("HUM");
    });

    it("returns letters as a valid 3-letter block", () => {
      const parsed = parseDisplayId("HUM-AAC-050");
      expect(parsed.letters).toMatch(/^[A-Z]{3}$/);
      expect(parsed.letters).toBe("AAC");
    });

    it("returns number as parsed integer (not string)", () => {
      const parsed = parseDisplayId("HUM-AAA-007");
      expect(typeof parsed.number).toBe("number");
      expect(parsed.number).toBe(7);
    });

    it("returns counter computed from block index and number", () => {
      // AAC is block index 2, number 50 → counter = 2*999 + 50 = 2048
      const parsed = parseDisplayId("HUM-AAC-050");
      expect(parsed.counter).toBe(2 * 999 + 50);
    });

    it("counter for AAA-001 is exactly 1", () => {
      const parsed = parseDisplayId("HUM-AAA-001");
      expect(parsed.counter).toBe(1);
    });

    it("counter for ZZZ-999 is exactly 17558424", () => {
      const parsed = parseDisplayId("HUM-ZZZ-999");
      expect(parsed.counter).toBe(MAX_COUNTER);
    });
  });
});
