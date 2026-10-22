import { z } from "zod";

export const walletProviderSchema = z.enum(["YAPE", "PLIN"]);

export const webhookHeadersSchema = z.object({
  deviceId: z.string().uuid("X-Device-Id must be a valid UUID"),
  timestamp: z
    .string()
    .regex(/^\d+$/, "X-Timestamp must be Unix epoch seconds"),
  signature: z.string().min(64, "X-Signature must be a valid HMAC-SHA256 hex"),
});

export const ingestPayloadSchema = z.object({
  idempotencyKey: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      "idempotencyKey must be a 64-character SHA-256 hex string"
    ),
  wallet: walletProviderSchema,
  amount: z
    .number()
    .positive("amount must be greater than 0")
    .max(999999.99, "amount exceeds maximum limit"),
  senderName: z
    .string()
    .trim()
    .min(1, "senderName is required")
    .max(160, "senderName is too long"),
  securityCode: z
    .string()
    .trim()
    .regex(/^\d{3}$/, "securityCode must be a 3-digit code")
    .nullable()
    .optional(),
  rawNotification: z
    .string()
    .trim()
    .min(1, "rawNotification is required")
    .max(2000, "rawNotification is too long"),
  notifiedAt: z
    .string()
    .datetime({ offset: true, message: "notifiedAt must be ISO-8601 UTC/offset string" }),
});

export const heartbeatPayloadSchema = z.object({
  batteryLevel: z
    .number()
    .int()
    .min(0, "batteryLevel must be between 0 and 100")
    .max(100, "batteryLevel must be between 0 and 100")
    .nullable()
    .optional(),
});

export type WalletProvider = z.infer<typeof walletProviderSchema>;
export type WebhookHeaders = z.infer<typeof webhookHeadersSchema>;
export type IngestPayload = z.infer<typeof ingestPayloadSchema>;
export type HeartbeatPayload = z.infer<typeof heartbeatPayloadSchema>;
