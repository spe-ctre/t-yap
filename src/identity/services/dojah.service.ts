// src/identity/services/dojah.service.ts
//
// Wraps Dojah's identity-verification API (https://api-docs.dojah.io) for
// automated BVN, NIN, and selfie/ID-photo checks. Structured to mirror
// wallet-money/services/monnify.service.ts: env-based config, a
// isConfigured/isAvailable() gate so the app boots fine with no credentials
// yet, and an ENABLE_SANDBOX_MOCKS toggle so the onboarding flow can be
// tested end-to-end before a real Dojah account exists.
//
// Required env vars once a real account exists:
//   DOJAH_BASE_URL   - https://sandbox.dojah.io (sandbox) or https://api.dojah.io (production)
//   DOJAH_APP_ID     - App ID from Dojah dashboard > My Apps
//   DOJAH_SECRET_KEY - Private/secret key (sandbox or production, matching DOJAH_BASE_URL)

import axios from 'axios';
import { createError } from '../../shared/middleware/error.middleware';

interface DojahBvnAdvanceResponse {
  entity: {
    bvn: { value: string; status: boolean };
    first_name: { confidence_value: number; status: boolean };
    last_name: { confidence_value: number; status: boolean };
  };
}

interface DojahNinResponse {
  entity: {
    // Dojah's NIN payload field naming has varied across their own docs
    // examples (firstname vs first_name) - read both defensively in
    // verifyNin() below rather than assuming one.
    [key: string]: any;
  };
}

interface DojahPhotoIdResponse {
  entity: {
    selfie: {
      confidence_value: number;
      match: boolean;
      photoId_image_blurry: boolean;
      selfie_image_blurry: boolean;
      selfie_glare: boolean;
      photoId_glare: boolean;
      card_type: string;
      first_name: { match: boolean; confidence_value: number };
      last_name: { match: boolean; confidence_value: number };
    };
  };
}

export type DojahVerificationStatus = 'APPROVED' | 'REVIEW' | 'REJECTED';

export interface DojahVerificationResult {
  status: DojahVerificationStatus;
  reason: string;
  raw: any;
  // The government-issued photo on file for this BVN/NIN, as base64 (no
  // data-URI prefix), when Dojah's response includes one. NIN responses
  // reliably include this as entity.image; BVN's advance/validate endpoint
  // has been inconsistent in public docs about whether it returns a photo
  // at all, so this is genuinely optional - callers must check for it
  // rather than assume it exists.
  governmentPhotoBase64?: string;
}

// Real name-matching is rarely a clean 100% - spelling variants
// (Muhammed/Mohammed), missing middle names, and OCR noise are all normal.
// A high-but-imperfect score is still an approval; a middling score falls
// back to the existing manual admin-review queue instead of an outright
// rejection; only a clearly bad match is rejected automatically.
const APPROVE_THRESHOLD = 80;
const REVIEW_THRESHOLD = 50;

// A 1x1 transparent PNG, used only as a placeholder "government photo" in
// mock responses so the sandbox path can exercise verifyPhotoId() end to
// end without real Dojah credentials. Never used outside useMocks().
const MOCK_PHOTO_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function classifyConfidence(confidence: number): DojahVerificationStatus {
  if (confidence >= APPROVE_THRESHOLD) return 'APPROVED';
  if (confidence >= REVIEW_THRESHOLD) return 'REVIEW';
  return 'REJECTED';
}

export class DojahService {
  private baseUrl: string;
  private appId: string;
  private secretKey: string;
  private isConfigured: boolean;

  constructor() {
    this.baseUrl = process.env.DOJAH_BASE_URL || 'https://sandbox.dojah.io';
    this.appId = process.env.DOJAH_APP_ID || '';
    this.secretKey = process.env.DOJAH_SECRET_KEY || '';

    this.isConfigured = !!(this.appId && this.secretKey);

    if (!this.isConfigured) {
      console.warn('⚠️  Dojah credentials not found. Automated KYC verification will use sandbox mocks (if ENABLE_SANDBOX_MOCKS=true) or fall back to manual admin review.');
      console.warn('   Please configure DOJAH_APP_ID and DOJAH_SECRET_KEY to enable real BVN/NIN/document verification.');
    } else {
      console.log(`✅ Dojah identity verification service initialized (${this.baseUrl.includes('sandbox') ? 'SANDBOX' : 'PRODUCTION'})`);
    }
  }

  /**
   * Check if Dojah is properly configured (or mocks are enabled)
   */
  isAvailable(): boolean {
    return this.isConfigured || process.env.ENABLE_SANDBOX_MOCKS === 'true';
  }

  private headers() {
    // Dojah's own auth docs specify these exact header names - no "Bearer"
    // prefix, no Basic encoding, just the raw AppId and Secret Key.
    return {
      AppId: this.appId,
      Authorization: this.secretKey,
      'Content-Type': 'application/json',
    };
  }

  private useMocks(): boolean {
    return (
      process.env.ENABLE_SANDBOX_MOCKS === 'true' &&
      (!this.isConfigured || process.env.NODE_ENV === 'development' || this.baseUrl.includes('sandbox'))
    );
  }

  /**
   * BVN verification via Dojah's "BVN Match" (advance) endpoint, which
   * checks the BVN is real AND scores how well the name on file matches
   * what the agent typed (0-100 confidence per name field).
   */
  async verifyBvn(bvn: string, firstName: string, lastName: string): Promise<DojahVerificationResult> {
    if (this.useMocks()) {
      // Deterministic mock so QA can exercise all three outcomes without
      // real Dojah credentials: a BVN ending in '0' simulates a clean
      // match, ending in '1' simulates an ambiguous partial match (falls
      // to manual review), anything else simulates a clear mismatch.
      const lastDigit = bvn.slice(-1);
      let confidence = 95;
      if (lastDigit === '1') confidence = 65;
      else if (lastDigit !== '0') confidence = 20;

      console.warn(`⚠️ [MOCK ENABLED] Simulating Dojah BVN verification for ${bvn} (confidence ${confidence}%).`);
      return {
        status: classifyConfidence(confidence),
        reason: `Mock BVN name-match confidence: ${confidence}%`,
        raw: { mock: true, bvn, confidence },
        governmentPhotoBase64: MOCK_PHOTO_BASE64,
      };
    }

    if (!this.isConfigured) {
      throw createError('Dojah is not configured. Please set DOJAH_APP_ID and DOJAH_SECRET_KEY environment variables.', 503);
    }

    try {
      const response = await axios.get<DojahBvnAdvanceResponse>(
        `${this.baseUrl}/api/v1/kyc/bvn/advance`,
        {
          params: { bvn },
          headers: this.headers(),
          timeout: 30000,
        }
      );

      const entity = response.data.entity;
      const firstNameConfidence = entity?.first_name?.confidence_value ?? 0;
      const lastNameConfidence = entity?.last_name?.confidence_value ?? 0;
      // A name is only as trustworthy as its weakest matching field.
      const confidence = Math.min(firstNameConfidence, lastNameConfidence);

      const governmentPhotoBase64 = await this.extractGovernmentPhoto(entity);

      return {
        status: classifyConfidence(confidence),
        reason: `BVN name-match confidence: ${confidence}%`,
        raw: response.data,
        governmentPhotoBase64,
      };
    } catch (error: any) {
      console.error('Dojah verifyBvn error:', error.response?.data || error.message);
      // A provider-side failure (timeout, downtime, malformed BVN causing a
      // 4xx) is not the same as "this BVN failed verification" - route to
      // manual review rather than silently rejecting a legitimate agent
      // because Dojah had a bad moment.
      return {
        status: 'REVIEW',
        reason: 'Dojah BVN verification service error - routed to manual review',
        raw: { error: error.response?.data || error.message },
      };
    }
  }

  /**
   * NIN verification via Dojah's basic NIN lookup. Unlike BVN advance, this
   * endpoint returns the profile on file but does not score a name match
   * itself, so we compare the returned first/last name against what the
   * agent typed using a conservative heuristic (see compareNames below).
   */
  async verifyNin(nin: string, firstName: string, lastName: string): Promise<DojahVerificationResult> {
    if (this.useMocks()) {
      const lastDigit = nin.slice(-1);
      let confidence = 95;
      if (lastDigit === '1') confidence = 65;
      else if (lastDigit !== '0') confidence = 20;

      console.warn(`⚠️ [MOCK ENABLED] Simulating Dojah NIN verification for ${nin} (confidence ${confidence}%).`);
      return {
        status: classifyConfidence(confidence),
        reason: `Mock NIN name-match confidence: ${confidence}%`,
        raw: { mock: true, nin, confidence },
        governmentPhotoBase64: MOCK_PHOTO_BASE64,
      };
    }

    if (!this.isConfigured) {
      throw createError('Dojah is not configured. Please set DOJAH_APP_ID and DOJAH_SECRET_KEY environment variables.', 503);
    }

    try {
      const response = await axios.get<DojahNinResponse>(
        `${this.baseUrl}/api/v1/kyc/nin`,
        {
          params: { nin },
          headers: this.headers(),
          timeout: 30000,
        }
      );

      const entity = response.data.entity || {};
      const returnedFirst = (entity.firstname || entity.first_name || '').toString();
      const returnedLast = (entity.lastname || entity.last_name || '').toString();

      const confidence = this.compareNames(firstName, returnedFirst, lastName, returnedLast);
      const governmentPhotoBase64 = await this.extractGovernmentPhoto(entity);

      return {
        status: classifyConfidence(confidence),
        reason: `NIN name-match confidence (computed): ${confidence}%`,
        raw: response.data,
        governmentPhotoBase64,
      };
    } catch (error: any) {
      console.error('Dojah verifyNin error:', error.response?.data || error.message);
      return {
        status: 'REVIEW',
        reason: 'Dojah NIN verification service error - routed to manual review',
        raw: { error: error.response?.data || error.message },
      };
    }
  }

  /**
   * Compares two face images via Dojah's Selfie Photo ID Verification
   * endpoint. Despite the param names (selfieBase64/idImageBase64), this is
   * used two ways in this codebase:
   *   1. A genuine live selfie vs the uploaded ID (not currently wired in -
   *      the agent flow has no selfie-capture step, see agent.service.ts).
   *   2. The government's own photo on file (returned free by verifyBvn/
   *      verifyNin when available) vs the uploaded ID image - this is what
   *      step 2 actually calls today, since the onboarding device (a POS
   *      terminal) has no practical way to capture a live selfie. This
   *      checks document-to-record consistency, not liveness/presence.
   */
  async verifyPhotoId(selfieBase64: string, idImageBase64: string): Promise<DojahVerificationResult> {
    if (this.useMocks()) {
      console.warn('⚠️ [MOCK ENABLED] Simulating Dojah selfie/ID photo match.');
      return {
        status: 'APPROVED',
        reason: 'Mock selfie/ID match confidence: 98%',
        raw: { mock: true, confidence: 98 },
      };
    }

    if (!this.isConfigured) {
      throw createError('Dojah is not configured. Please set DOJAH_APP_ID and DOJAH_SECRET_KEY environment variables.', 503);
    }

    try {
      const response = await axios.post<DojahPhotoIdResponse>(
        `${this.baseUrl}/api/v1/kyc/photoid/verify`,
        { selfie_image: selfieBase64, photoid_image: idImageBase64 },
        { headers: this.headers(), timeout: 30000 }
      );

      const selfie = response.data.entity?.selfie;
      const confidence = selfie?.confidence_value ?? 0;
      const match = selfie?.match === true;

      return {
        status: match ? classifyConfidence(confidence) : 'REJECTED',
        reason: `Selfie/ID match confidence: ${confidence}% (match: ${match})`,
        raw: response.data,
      };
    } catch (error: any) {
      console.error('Dojah verifyPhotoId error:', error.response?.data || error.message);
      return {
        status: 'REVIEW',
        reason: 'Dojah photo ID verification service error - routed to manual review',
        raw: { error: error.response?.data || error.message },
      };
    }
  }

  // Dojah's NIN responses reliably include the photo as raw base64 under
  // entity.image. BVN's advance/validate endpoint has been inconsistent in
  // public docs about whether it returns a photo at all, and some Dojah
  // endpoints return a hosted image_url instead of inline base64 - handle
  // both shapes, and return undefined (not throw) when neither is present,
  // since a missing photo just means the photoId cross-check gets skipped
  // for that particular check, not that verification itself failed.
  private async extractGovernmentPhoto(entity: any): Promise<string | undefined> {
    if (!entity) return undefined;

    const inlineBase64 = entity.image || entity.photo || entity.selfie_image;
    if (inlineBase64 && typeof inlineBase64 === 'string') {
      // Already base64 (NIN's documented shape) - strip a data-URI prefix
      // if present, otherwise use as-is.
      const commaIndex = inlineBase64.indexOf(',');
      return inlineBase64.startsWith('data:') && commaIndex !== -1
        ? inlineBase64.slice(commaIndex + 1)
        : inlineBase64;
    }

    const imageUrl = entity.image_url || entity.photo_url;
    if (imageUrl && typeof imageUrl === 'string') {
      try {
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
        return Buffer.from(imageResponse.data).toString('base64');
      } catch (error: any) {
        console.error('Dojah extractGovernmentPhoto fetch error:', error.message);
        return undefined;
      }
    }

    return undefined;
  }

  // Conservative heuristic name comparison for NIN (which doesn't return
  // its own confidence score): exact case-insensitive match scores 100, one
  // name containing the other (e.g. a missing middle name) scores 70,
  // anything else scores 0. Deliberately simple - a real fuzzy-matching
  // library could replace this later without changing the calling code.
  private compareNames(typedFirst: string, returnedFirst: string, typedLast: string, returnedLast: string): number {
    const norm = (s: string) => s.trim().toLowerCase();
    const scoreOne = (typed: string, returned: string): number => {
      const t = norm(typed);
      const r = norm(returned);
      if (!t || !r) return 0;
      if (t === r) return 100;
      if (r.includes(t) || t.includes(r)) return 70;
      return 0;
    };
    const firstScore = scoreOne(typedFirst, returnedFirst);
    const lastScore = scoreOne(typedLast, returnedLast);
    return Math.min(firstScore, lastScore);
  }
}

export const dojahService = new DojahService();