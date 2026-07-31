// src/utils/phone.ts

/**
 * Normalize Nigerian phone numbers to international format
 * Converts: 08012345678 -> +2348012345678
 * Accepts: 08012345678, 2348012345678, +2348012345678
 */
export function normalizePhoneNumber(phone: string): string {
    // Remove all spaces and hyphens
    let normalized = phone.replace(/[\s-]/g, '');
  
    // If starts with 0, replace with +234
    if (normalized.startsWith('0')) {
      normalized = '+234' + normalized.substring(1);
    }
    // If starts with 234 (without +), add +
    else if (normalized.startsWith('234') && !normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }
    // If doesn't start with +234, assume it's missing country code
    else if (!normalized.startsWith('+234')) {
      normalized = '+234' + normalized;
    }
  
    return normalized;
  }
  
  /**
   * Validate Nigerian phone number format
   */
  export function isValidNigerianPhone(phone: string): boolean {
    const normalized = normalizePhoneNumber(phone);
    // Nigerian numbers: +234 followed by 10 digits
    return /^\+234[0-9]{10}$/.test(normalized);
  }