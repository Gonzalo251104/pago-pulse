import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export type HmacVerificationFailureReason =
  | "MISSING_PARAMETERS"
  | "INVALID_TIMESTAMP"
  | "TIMESTAMP_EXPIRED"
  | "SIGNATURE_MISMATCH";

export interface VerifyHmacParams {
  secret: string;
  timestamp: string;
  rawBody: string;
  signature: string;
  /**
   * Maximum allowed clock skew / replay window in seconds.
   * Defaults to 300 seconds (5 minutes). Pass 0 or Infinity to disable timestamp window check if needed.
   */
  toleranceSeconds?: number;
  /**
   * Optional override for current Unix epoch in seconds (used for deterministic unit testing).
   */
  nowEpochSeconds?: number;
}

export interface VerifyHmacResult {
  valid: boolean;
  reason?: HmacVerificationFailureReason;
}

const DEFAULT_TOLERANCE_SECONDS = 300;
const HEX_64_REGEX = /^[0-9a-fA-F]{64}$/;

/**
 * Computes the canonical HMAC-SHA256 hex signature for a webhook payload:
 * HMAC_SHA256(webhook_secret, "${timestamp}.${rawBody}")
 */
export function computeHmacSignature(
  secret: string,
  timestamp: string,
  rawBody: string
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
}

/**
 * Computes a deterministic SHA-256 hex digest used for payment idempotency keys.
 */
export function computeIdempotencyKey(canonicalInput: string): string {
  return createHash("sha256").update(canonicalInput, "utf8").digest("hex");
}

/**
 * Verifies an incoming webhook HMAC-SHA256 signature using constant-time comparison
 * and validates the Unix epoch timestamp against replay attacks.
 */
export function verifyHmacSignature({
  secret,
  timestamp,
  rawBody,
  signature,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
  nowEpochSeconds = Math.floor(Date.now() / 1000),
}: VerifyHmacParams): VerifyHmacResult {
  if (!secret || !timestamp || !signature) {
    return { valid: false, reason: "MISSING_PARAMETERS" };
  }

  if (!/^\d+$/.test(timestamp)) {
    return { valid: false, reason: "INVALID_TIMESTAMP" };
  }

  const parsedTimestamp = Number(timestamp);
  if (!Number.isSafeInteger(parsedTimestamp) || parsedTimestamp <= 0) {
    return { valid: false, reason: "INVALID_TIMESTAMP" };
  }

  if (
    Number.isFinite(toleranceSeconds) &&
    toleranceSeconds > 0 &&
    Math.abs(nowEpochSeconds - parsedTimestamp) > toleranceSeconds
  ) {
    return { valid: false, reason: "TIMESTAMP_EXPIRED" };
  }

  const normalizedSignature = signature.trim().replace(/^sha256=/i, "");
  if (!HEX_64_REGEX.test(normalizedSignature)) {
    return { valid: false, reason: "SIGNATURE_MISMATCH" };
  }

  const expectedHex = computeHmacSignature(secret, timestamp, rawBody);
  const expectedBuffer = Buffer.from(expectedHex, "hex");
  const providedBuffer = Buffer.from(normalizedSignature.toLowerCase(), "hex");

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return { valid: false, reason: "SIGNATURE_MISMATCH" };
  }

  return { valid: true };
}
