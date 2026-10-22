import { describe, expect, it } from "vitest";
import {
  computeHmacSignature,
  computeIdempotencyKey,
  verifyHmacSignature,
} from "@/lib/security/verify-hmac";

describe("verifyHmacSignature", () => {
  const secret =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const nowEpochSeconds = 1792621800; // 2026-10-21T22:30:00Z
  const timestamp = String(nowEpochSeconds);
  const rawBody = JSON.stringify({
    idempotencyKey:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    wallet: "YAPE",
    amount: 45.5,
    senderName: "Carlos Mendoza",
    securityCode: "842",
    rawNotification:
      "Confirmación de Pago. Carlos Mendoza te envió un pago por S/ 45.50. El código de seguridad es: 842",
    notifiedAt: "2026-10-21T22:30:00Z",
  });

  it("validates a legitimately signed webhook payload", () => {
    const signature = computeHmacSignature(secret, timestamp, rawBody);
    const result = verifyHmacSignature({
      secret,
      timestamp,
      rawBody,
      signature,
      nowEpochSeconds,
    });

    expect(result).toEqual({ valid: true });
  });

  it("accepts uppercase hex or optional sha256= prefix in signature header", () => {
    const signature = computeHmacSignature(secret, timestamp, rawBody);
    const result = verifyHmacSignature({
      secret,
      timestamp,
      rawBody,
      signature: `sha256=${signature.toUpperCase()}`,
      nowEpochSeconds,
    });

    expect(result).toEqual({ valid: true });
  });

  it("rejects payload when body has been tampered with (amount modified)", () => {
    const signature = computeHmacSignature(secret, timestamp, rawBody);
    const tamperedBody = rawBody.replace("45.5", "450.5");

    const result = verifyHmacSignature({
      secret,
      timestamp,
      rawBody: tamperedBody,
      signature,
      nowEpochSeconds,
    });

    expect(result).toEqual({
      valid: false,
      reason: "SIGNATURE_MISMATCH",
    });
  });

  it("rejects payload signed with a different webhook secret", () => {
    const wrongSecret =
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    const signature = computeHmacSignature(wrongSecret, timestamp, rawBody);

    const result = verifyHmacSignature({
      secret,
      timestamp,
      rawBody,
      signature,
      nowEpochSeconds,
    });

    expect(result).toEqual({
      valid: false,
      reason: "SIGNATURE_MISMATCH",
    });
  });

  it("rejects expired timestamps outside the replay tolerance window", () => {
    const staleTimestamp = String(nowEpochSeconds - 600); // 10 minutes old
    const signature = computeHmacSignature(secret, staleTimestamp, rawBody);

    const result = verifyHmacSignature({
      secret,
      timestamp: staleTimestamp,
      rawBody,
      signature,
      toleranceSeconds: 300,
      nowEpochSeconds,
    });

    expect(result).toEqual({
      valid: false,
      reason: "TIMESTAMP_EXPIRED",
    });
  });

  it("rejects malformed timestamps", () => {
    const result = verifyHmacSignature({
      secret,
      timestamp: "not-a-timestamp",
      rawBody,
      signature: "a".repeat(64),
      nowEpochSeconds,
    });

    expect(result).toEqual({
      valid: false,
      reason: "INVALID_TIMESTAMP",
    });
  });

  it("rejects missing parameters", () => {
    const result = verifyHmacSignature({
      secret: "",
      timestamp,
      rawBody,
      signature: "a".repeat(64),
      nowEpochSeconds,
    });

    expect(result).toEqual({
      valid: false,
      reason: "MISSING_PARAMETERS",
    });
  });

  it("computes deterministic 64-char hex idempotency keys", () => {
    const key1 = computeIdempotencyKey("YAPE|45.50|Carlos Mendoza|842|1792621800");
    const key2 = computeIdempotencyKey("YAPE|45.50|Carlos Mendoza|842|1792621800");

    expect(key1).toBe(key2);
    expect(key1).toMatch(/^[0-9a-f]{64}$/);
  });
});
