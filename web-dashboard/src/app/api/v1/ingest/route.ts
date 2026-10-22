import { NextRequest, NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/security/verify-hmac";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  ingestPayloadSchema,
  webhookHeadersSchema,
} from "@/lib/validators/ingest.schema";

export async function POST(request: NextRequest) {
  const rawHeaders = {
    deviceId: request.headers.get("x-device-id") ?? "",
    timestamp: request.headers.get("x-timestamp") ?? "",
    signature: request.headers.get("x-signature") ?? "",
  };

  const headerValidation = webhookHeadersSchema.safeParse(rawHeaders);
  if (!headerValidation.success) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Missing or malformed webhook authentication headers",
        details: headerValidation.error.flatten().fieldErrors,
      },
      { status: 401 }
    );
  }

  const { deviceId, timestamp, signature } = headerValidation.data;
  const rawBody = await request.text();

  const supabase = createSupabaseServiceClient();

  // 1. Fetch active listener device and its HMAC secret
  const { data: device, error: deviceError } = await supabase
    .from("listener_devices")
    .select("id, organization_id, webhook_secret, is_active")
    .eq("id", deviceId)
    .single();

  if (deviceError || !device || !device.is_active) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Unknown or inactive listener device",
      },
      { status: 401 }
    );
  }

  // 2. Verify HMAC-SHA256 signature before parsing untrusted payload
  const hmacResult = verifyHmacSignature({
    secret: device.webhook_secret,
    timestamp,
    rawBody,
    signature,
  });

  if (!hmacResult.valid) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: "Webhook signature verification failed",
        reason: hmacResult.reason,
      },
      { status: 401 }
    );
  }

  // 3. Parse and validate JSON body with Zod
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message: "Request body must be valid JSON",
      },
      { status: 400 }
    );
  }

  const payloadValidation = ingestPayloadSchema.safeParse(parsedJson);
  if (!payloadValidation.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid payment webhook payload",
        details: payloadValidation.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const payload = payloadValidation.data;
  const normalizedIdempotencyKey = payload.idempotencyKey.toLowerCase();

  // 4. Insert payment transaction with deterministic idempotency key handling
  const { data: insertedPayment, error: insertError } = await supabase
    .from("payment_transactions")
    .insert({
      organization_id: device.organization_id,
      device_id: device.id,
      idempotency_key: normalizedIdempotencyKey,
      wallet: payload.wallet,
      amount: payload.amount,
      currency: "PEN",
      sender_name: payload.senderName,
      security_code: payload.securityCode ?? null,
      raw_notification: payload.rawNotification,
      status: "UNCLAIMED",
      notified_at: payload.notifiedAt,
    })
    .select("id, idempotency_key, status, created_at")
    .single();

  if (insertError) {
    // PostgreSQL unique_violation code is 23505 -> idempotent retry
    if (insertError.code === "23505") {
      const { data: existingPayment } = await supabase
        .from("payment_transactions")
        .select("id, idempotency_key, status, created_at")
        .eq("idempotency_key", normalizedIdempotencyKey)
        .single();

      return NextResponse.json(
        {
          status: "duplicate",
          payment: existingPayment ?? {
            idempotency_key: normalizedIdempotencyKey,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to persist payment transaction",
      },
      { status: 500 }
    );
  }

  // 5. Opportunistically refresh device heartbeat timestamp
  await supabase
    .from("listener_devices")
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq("id", device.id);

  return NextResponse.json(
    {
      status: "created",
      payment: insertedPayment,
    },
    { status: 201 }
  );
}
