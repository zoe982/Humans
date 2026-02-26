const PBKDF2_ITERATIONS = 100_000;
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

let cachedKey: CryptoKey | null = null;

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

export async function deriveKey(
  sessionToken: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionToken),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const saltBuf: ArrayBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuf, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: AES_KEY_LENGTH },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encrypt(
  key: CryptoKey,
  data: unknown,
): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer },
    key,
    encoded,
  );
  return { iv, ciphertext };
}

export async function decrypt(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: ArrayBuffer,
): Promise<unknown> {
  const ivBuf = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuf },
    key,
    ciphertext,
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as unknown;
}

export function clearKey(): void {
  cachedKey = null;
}

export function getCachedKey(): CryptoKey | null {
  return cachedKey;
}

export function setCachedKey(key: CryptoKey): void {
  cachedKey = key;
}
