import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 32 bytes for AES-256
const IV_LENGTH = 16; // 16 bytes for IV
const AUTH_TAG_LENGTH = 16; // 16 bytes for auth tag

/**
 * Get encryption key from environment variable
 * Falls back to deriving from JWT_SECRET if BIOMETRIC_ENCRYPTION_KEY is not set
 */
const getEncryptionKey = (): Buffer => {
  const key = process.env.BIOMETRIC_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!key) {
    throw new Error('Encryption key not found. Set BIOMETRIC_ENCRYPTION_KEY or JWT_SECRET');
  }

  // If key is exactly 32 bytes (64 hex chars), use it directly
  // Otherwise, derive a 32-byte key using SHA-256
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, 'hex');
  }

  // Derive 32-byte key from the provided key
  return crypto.createHash('sha256').update(key).digest();
};

/**
 * Encrypt biometric data using AES-256-GCM
 * Returns: { encryptedData, iv, authTag } as base64 strings
 */
export const encryptBiometricData = (data: string): { encryptedData: string; iv: string; authTag: string } => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(data, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
};

/**
 * Decrypt biometric data using AES-256-GCM
 * Input: { encryptedData, iv, authTag } as base64 strings
 */
export const decryptBiometricData = (encrypted: { encryptedData: string; iv: string; authTag: string }): string => {
  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');
  const encryptedData = Buffer.from(encrypted.encryptedData, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
};

/**
 * Store encrypted biometric data in a single string format
 * Format: iv:authTag:encryptedData (all base64)
 */
export const serializeEncryptedData = (encrypted: { encryptedData: string; iv: string; authTag: string }): string => {
  return `${encrypted.iv}:${encrypted.authTag}:${encrypted.encryptedData}`;
};

/**
 * Deserialize encrypted biometric data from stored string
 */
export const deserializeEncryptedData = (serialized: string): { encryptedData: string; iv: string; authTag: string } => {
  const parts = serialized.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  return {
    iv: parts[0],
    authTag: parts[1],
    encryptedData: parts[2]
  };
};

