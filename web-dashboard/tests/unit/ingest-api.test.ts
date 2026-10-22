import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { computeHmacSignature } from "@/lib/security/verify-hmac";
import { POST as postIngest } from "@/app/api/v1/ingest/route";
import { POST as postHeartbeat } from "@/app/api/v1/heartbeat/route";

const mockDevice = {
  id: "00000000-0000-4000-8000-000000000001",
  organization_id: "00000000-0000-4000-8000-000000000099",
  webhook_secret:
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  is_active: true,
};

let mockDeviceRecord: typeof mockDevice | null = mockDevice;
let mockInsertError: { code?: string; message: string } | null = null;
let mockInsertedPayment: Record<string, unknown> | null = null;
let mockUpdatedDevicePayload: Record<string, unknown> | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: () => ({
    from: (table: string) => {
      if (table === "listener_devices") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: mockDeviceRecord,
                error: mockDeviceRecord ? null : { message: "Not found" },
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => {
            mockUpdatedDevicePayload = payload;
            return {
              eq: async () => ({ error: null }),
            };
          },
        };
      }

      if (table === "payment_transactions") {
        return {
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                if (mockInsertError) {
                  return { data: null, error: mockInsertError };
                }
                mockInsertedPayment = {
                  id: "00000000-0000-4000-8000-000000000555",
                  idempotency_key: row.idempotency_key,
                  status: row.status,
                  created_at: "2026-10-21T22:30:01Z",
                };
                return { data: mockInsertedPayment, error: null };
              },
            }),
          }),
          select: () => ({
            eq: (_col: string, val: string) => ({
              single: async () => ({
                data: {
                  id: "00000000-0000-4000-8000-000000000555",
                  idempotency_key: val,
                  status: "UNCLAIMED",
                  created_at: "2026-10-21T22:30:00Z",
                },
                error: null,
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

describe("POST /api/v1/ingest & POST /api/v1/heartbeat", () => {
  const validPayload = {
    idempotencyKey:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    wallet: "YAPE" as const,
    amount: 45.5,
    senderName: "Carlos Mendoza",
    securityCode: "842",
    rawNotification:
      "Confirmación de Pago. Carlos Mendoza te envió un pago por S/ 45.50. El código de seguridad es: 842",
    notifiedAt: "2026-10-21T22:30:00Z",
  };

  beforeEach(() => {
    mockDeviceRecord = { ...mockDevice };
    mockInsertError = null;
    mockInsertedPayment = null;
    mockUpdatedDevicePayload = null;
  });

  it("returns 201 Created for a valid HMAC-signed Yape payment", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify(validPayload);
    const signature = computeHmacSignature(
      mockDevice.webhook_secret,
      timestamp,
      rawBody
    );

    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": mockDevice.id,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
      },
      body: rawBody,
    });

    const response = await postIngest(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.status).toBe("created");
    expect(json.payment.idempotency_key).toBe(validPayload.idempotencyKey);
  });

  it("returns 200 OK when duplicate idempotencyKey is sent (idempotent retry)", async () => {
    mockInsertError = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    };

    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify(validPayload);
    const signature = computeHmacSignature(
      mockDevice.webhook_secret,
      timestamp,
      rawBody
    );

    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": mockDevice.id,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
      },
      body: rawBody,
    });

    const response = await postIngest(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("duplicate");
    expect(json.payment.idempotency_key).toBe(validPayload.idempotencyKey);
  });

  it("returns 401 Unauthorized when HMAC signature is invalid", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify(validPayload);

    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": mockDevice.id,
        "X-Timestamp": timestamp,
        "X-Signature": "a".repeat(64),
      },
      body: rawBody,
    });

    const response = await postIngest(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 Unauthorized when device is inactive", async () => {
    mockDeviceRecord = { ...mockDevice, is_active: false };

    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify(validPayload);
    const signature = computeHmacSignature(
      mockDevice.webhook_secret,
      timestamp,
      rawBody
    );

    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": mockDevice.id,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
      },
      body: rawBody,
    });

    const response = await postIngest(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 Bad Request when payload fails Zod validation (e.g. negative amount)", async () => {
    const invalidPayload = { ...validPayload, amount: -15 };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify(invalidPayload);
    const signature = computeHmacSignature(
      mockDevice.webhook_secret,
      timestamp,
      rawBody
    );

    const request = new NextRequest("http://localhost:3000/api/v1/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": mockDevice.id,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
      },
      body: rawBody,
    });

    const response = await postIngest(request);
    expect(response.status).toBe(400);
  });

  it("updates last_heartbeat_at and battery_level on POST /api/v1/heartbeat", async () => {
    const heartbeatPayload = { batteryLevel: 88 };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify(heartbeatPayload);
    const signature = computeHmacSignature(
      mockDevice.webhook_secret,
      timestamp,
      rawBody
    );

    const request = new NextRequest("http://localhost:3000/api/v1/heartbeat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-Id": mockDevice.id,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
      },
      body: rawBody,
    });

    const response = await postHeartbeat(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.batteryLevel).toBe(88);
    expect(mockUpdatedDevicePayload?.battery_level).toBe(88);
  });
});
