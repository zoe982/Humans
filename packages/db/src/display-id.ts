export const GREEK_ALPHABET = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "zeta",
  "eta",
  "theta",
  "iota",
  "kappa",
  "lambda",
  "mu",
  "nu",
  "xi",
  "omicron",
  "pi",
  "rho",
  "sigma",
  "tau",
  "upsilon",
  "phi",
  "chi",
  "psi",
  "omega",
] as const;

export type GreekLetter = (typeof GREEK_ALPHABET)[number];

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
] as const;

export type DisplayIdPrefix = (typeof DISPLAY_ID_PREFIXES)[number];

const NUMBERS_PER_LETTER = 999;

/**
 * Converts a sequential counter (1-based) to a display ID.
 * Counter 1 → XXX-alpha-001
 * Counter 999 → XXX-alpha-999
 * Counter 1000 → XXX-beta-001
 * Counter 23976 → XXX-omega-999
 */
export function formatDisplayId(prefix: DisplayIdPrefix, counter: number): string {
  if (counter < 1 || counter > GREEK_ALPHABET.length * NUMBERS_PER_LETTER) {
    throw new Error(
      `Counter ${counter} out of range (1-${GREEK_ALPHABET.length * NUMBERS_PER_LETTER})`,
    );
  }

  const letterIndex = Math.floor((counter - 1) / NUMBERS_PER_LETTER);
  const number = ((counter - 1) % NUMBERS_PER_LETTER) + 1;
  const letter = GREEK_ALPHABET[letterIndex];
  const paddedNumber = String(number).padStart(3, "0");

  return `${prefix}-${letter}-${paddedNumber}`;
}

/**
 * Parses a display ID back into its components.
 */
export function parseDisplayId(displayId: string): {
  prefix: DisplayIdPrefix;
  letter: GreekLetter;
  number: number;
  counter: number;
} {
  const parts = displayId.split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid display ID format: ${displayId}`);
  }

  const [prefix, letter, numberStr] = parts;
  const letterIndex = GREEK_ALPHABET.indexOf(letter as GreekLetter);
  if (letterIndex === -1) {
    throw new Error(`Invalid Greek letter in display ID: ${letter}`);
  }

  const number = parseInt(numberStr, 10);
  if (isNaN(number) || number < 1 || number > NUMBERS_PER_LETTER) {
    throw new Error(`Invalid number in display ID: ${numberStr}`);
  }

  return {
    prefix: prefix as DisplayIdPrefix,
    letter: letter as GreekLetter,
    number,
    counter: letterIndex * NUMBERS_PER_LETTER + number,
  };
}
