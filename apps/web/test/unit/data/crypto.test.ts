import { describe, it, expect, beforeEach } from "vitest";
import {
  deriveKey,
  encrypt,
  decrypt,
  clearKey,
  generateSalt,
} from "$lib/data/crypto";

describe("crypto", () => {
  const sessionToken = "test-session-token-abc123";

  beforeEach(() => {
    clearKey();
  });

  describe("generateSalt", () => {
    it("returns a 16-byte Uint8Array", () => {
      const salt = generateSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.byteLength).toBe(16);
    });

    it("returns different values on each call", () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toEqual(salt2);
    });
  });

  describe("deriveKey", () => {
    it("derives an AES-GCM CryptoKey from session token and salt", async () => {
      const salt = generateSalt();
      const key = await deriveKey(sessionToken, salt);
      expect(key).toBeDefined();
      expect(key.type).toBe("secret");
      expect(key.algorithm).toMatchObject({ name: "AES-GCM", length: 256 });
      expect(key.usages).toContain("encrypt");
      expect(key.usages).toContain("decrypt");
    });

    it("derives the same key for the same token and salt", async () => {
      const salt = generateSalt();
      const key1 = await deriveKey(sessionToken, salt);
      const key2 = await deriveKey(sessionToken, salt);
      // Export both keys to compare raw bytes
      const raw1 = await crypto.subtle.exportKey("raw", key1);
      const raw2 = await crypto.subtle.exportKey("raw", key2);
      expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2));
    });

    it("derives different keys for different tokens", async () => {
      const salt = generateSalt();
      const key1 = await deriveKey("token-a", salt);
      const key2 = await deriveKey("token-b", salt);
      const raw1 = await crypto.subtle.exportKey("raw", key1);
      const raw2 = await crypto.subtle.exportKey("raw", key2);
      expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2));
    });

    it("derives different keys for different salts", async () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const key1 = await deriveKey(sessionToken, salt1);
      const key2 = await deriveKey(sessionToken, salt2);
      const raw1 = await crypto.subtle.exportKey("raw", key1);
      const raw2 = await crypto.subtle.exportKey("raw", key2);
      expect(new Uint8Array(raw1)).not.toEqual(new Uint8Array(raw2));
    });
  });

  describe("encrypt / decrypt round-trip", () => {
    it("encrypts and decrypts an object correctly", async () => {
      const salt = generateSalt();
      const key = await deriveKey(sessionToken, salt);
      const data = { name: "Alice", id: "123", nested: { value: 42 } };

      const { iv, ciphertext } = await encrypt(key, data);
      const decrypted = await decrypt(key, iv, ciphertext);

      expect(decrypted).toEqual(data);
    });

    it("encrypts and decrypts an array correctly", async () => {
      const salt = generateSalt();
      const key = await deriveKey(sessionToken, salt);
      const data = [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ];

      const { iv, ciphertext } = await encrypt(key, data);
      const decrypted = await decrypt(key, iv, ciphertext);

      expect(decrypted).toEqual(data);
    });

    it("produces different ciphertexts for the same data (random IV)", async () => {
      const salt = generateSalt();
      const key = await deriveKey(sessionToken, salt);
      const data = { name: "Alice" };

      const result1 = await encrypt(key, data);
      const result2 = await encrypt(key, data);

      expect(result1.iv).not.toEqual(result2.iv);
      expect(new Uint8Array(result1.ciphertext)).not.toEqual(
        new Uint8Array(result2.ciphertext),
      );
    });

    it("fails to decrypt with wrong key", async () => {
      const salt = generateSalt();
      const key1 = await deriveKey("token-a", salt);
      const key2 = await deriveKey("token-b", salt);
      const data = { secret: "payload" };

      const { iv, ciphertext } = await encrypt(key1, data);

      await expect(decrypt(key2, iv, ciphertext)).rejects.toThrowError();
    });

    it("returns iv as Uint8Array and ciphertext as ArrayBuffer", async () => {
      const salt = generateSalt();
      const key = await deriveKey(sessionToken, salt);
      const { iv, ciphertext } = await encrypt(key, { test: true });

      expect(iv).toBeInstanceOf(Uint8Array);
      expect(iv.byteLength).toBe(12);
      expect(ciphertext).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe("clearKey", () => {
    it("is callable without error", () => {
      expect(() => clearKey()).not.toThrowError();
    });
  });
});
