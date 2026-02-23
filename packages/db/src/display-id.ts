export const DISPLAY_ID_PREFIXES = [
  "HUM",
  "ACC",
  "ACT",
  "COL",
  "LES",
  "LED",
  "GEO",
  "PET",
  "EML",
  "FON",
  "GEX",
  "ROU",
  "BOR",
  "ROI",
  "REX",
  "ERR",
  "SOC",
  "FRY",
  "OPP",
  "LEA",
  "FLY",
  "REF",
] as const;

export type DisplayIdPrefix = (typeof DISPLAY_ID_PREFIXES)[number];

const NUMBERS_PER_BLOCK = 999;
const TOTAL_LETTER_BLOCKS = 26 ** 3; // 17,576 (AAA-ZZZ)
const MAX_COUNTER = TOTAL_LETTER_BLOCKS * NUMBERS_PER_BLOCK; // 17,558,424

/**
 * Converts a block index (0-17575) to a 3-letter string "AAA"-"ZZZ" via base-26.
 */
function blockIndexToLetters(index: number): string {
  const c1 = Math.floor(index / 676); // 26*26
  const c2 = Math.floor(index / 26) % 26;
  const c3 = index % 26;
  return String.fromCharCode(65 + c1, 65 + c2, 65 + c3);
}

/**
 * Converts a 3-letter string "AAA"-"ZZZ" back to a block index (0-17575).
 */
function lettersToBlockIndex(letters: string): number {
  const c1 = letters.charCodeAt(0) - 65;
  const c2 = letters.charCodeAt(1) - 65;
  const c3 = letters.charCodeAt(2) - 65;
  return c1 * 676 + c2 * 26 + c3;
}

/**
 * Converts a sequential counter (1-based) to a display ID.
 * Counter 1 → XXX-AAA-001
 * Counter 999 → XXX-AAA-999
 * Counter 1000 → XXX-AAB-001
 * Counter 17558424 → XXX-ZZZ-999
 */
export function formatDisplayId(prefix: DisplayIdPrefix, counter: number): string {
  if (counter < 1 || counter > MAX_COUNTER) {
    throw new Error(
      `Counter ${String(counter)} out of range (1-${String(MAX_COUNTER)})`,
    );
  }

  const blockIndex = Math.floor((counter - 1) / NUMBERS_PER_BLOCK);
  const number = ((counter - 1) % NUMBERS_PER_BLOCK) + 1;
  const letters = blockIndexToLetters(blockIndex);
  const paddedNumber = String(number).padStart(3, "0");

  return `${prefix}-${letters}-${paddedNumber}`;
}

/**
 * Parses a display ID back into its components.
 */
export function parseDisplayId(displayId: string): {
  prefix: DisplayIdPrefix;
  letters: string;
  number: number;
  counter: number;
} {
  const parts = displayId.split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid display ID format: ${displayId}`);
  }

  const [prefix, letters, numberStr] = parts;
  if (prefix === undefined || letters === undefined || numberStr === undefined) {
    throw new Error(`Invalid display ID format: ${displayId}`);
  }

  if (!/^[A-Z]{3}$/.test(letters)) {
    throw new Error(`Invalid letter block in display ID: ${letters}`);
  }

  const blockIndex = lettersToBlockIndex(letters);

  const number = parseInt(numberStr, 10);
  if (isNaN(number) || number < 1 || number > NUMBERS_PER_BLOCK) {
    throw new Error(`Invalid number in display ID: ${numberStr}`);
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- validated by format check
    prefix: prefix as DisplayIdPrefix,
    letters,
    number,
    counter: blockIndex * NUMBERS_PER_BLOCK + number,
  };
}
