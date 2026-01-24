// Encryption service for secure storage of OAuth tokens
// Uses AES-256-GCM for authenticated encryption

import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// AES-256-GCM configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Get encryption key from environment
function getEncryptionKey(): Buffer {
    const keyHex = process.env.INTEGRATION_ENCRYPTION_KEY;

    if (!keyHex) {
        throw new Error(
            "INTEGRATION_ENCRYPTION_KEY environment variable is not set. " +
            "Generate a 32-byte hex key using: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        );
    }

    // Validate key format (should be 64 hex characters for 32 bytes)
    if (!/^[a-fA-F0-9]{64}$/.test(keyHex)) {
        throw new Error(
            "INTEGRATION_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
            "Generate one using: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        );
    }

    return Buffer.from(keyHex, "hex");
}

// Encrypt a plaintext string
// Returns: base64(iv + authTag + ciphertext)
export function encryptToken(plaintext: string): string {
    if (!plaintext) {
        throw new Error("Cannot encrypt empty string");
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Combine: IV (12 bytes) + Auth Tag (16 bytes) + Ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);

    return combined.toString("base64");
}

// Decrypt an encrypted token
// Input: base64(iv + authTag + ciphertext)
export function decryptToken(encryptedBase64: string): string {
    if (!encryptedBase64) {
        throw new Error("Cannot decrypt empty string");
    }

    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedBase64, "base64");

    // Minimum length: IV (12) + Auth Tag (16) + at least 1 byte of ciphertext
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
        throw new Error("Invalid encrypted data: too short");
    }

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    try {
        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString("utf8");
    } catch (error) {
        // Authentication failed or corrupted data
        throw new Error("Decryption failed: invalid data or key");
    }
}

// Verify that the encryption key is configured
export function isEncryptionConfigured(): boolean {
    try {
        getEncryptionKey();
        return true;
    } catch {
        return false;
    }
}

// Generate a new random encryption key (for setup purposes)
export function generateEncryptionKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString("hex");
}

// Rotate encryption - decrypt with old key, encrypt with new key
// This is a helper for key rotation scenarios
export async function rotateEncryption(
    encryptedData: string,
    oldKeyHex: string,
    newKeyHex: string
): Promise<string> {
    // Temporarily use old key to decrypt
    const oldKey = Buffer.from(oldKeyHex, "hex");
    const combined = Buffer.from(encryptedData, "base64");

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, oldKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const plaintext = decrypted.toString("utf8");

    // Encrypt with new key
    const newKey = Buffer.from(newKeyHex, "hex");
    const newIv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, newKey, newIv);
    let encrypted = cipher.update(plaintext, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const newAuthTag = cipher.getAuthTag();

    const newCombined = Buffer.concat([newIv, newAuthTag, encrypted]);
    return newCombined.toString("base64");
}
