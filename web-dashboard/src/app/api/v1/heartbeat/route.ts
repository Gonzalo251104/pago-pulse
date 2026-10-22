import { NextRequest, NextResponse } from "next/server";
import { verifyHmacSignature } from "@/lib/security/verify-hmac";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  heartbeatPayloadSchema,
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

  let parsedJson: unknown = {};
  if (rawBody.trim().length > 0) {
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
  }

  const payloadValidation = heartbeatPayloadSchema.safeParse(parsedJson);
  if (!payloadValidation.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Invalid heartbeat payload",
        details: payloadValidation.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const lastHeartbeatAt = new Date().toISOString();
  const updateData: { last_heartbeat_at: string; battery_level?: number | null } = {
    last_heartbeat_at: lastHeartbeatAt,
  };

  if (payloadValidation.data.batteryLevel !== undefined) {
    updateData.battery_level = payloadValidation.data.batteryLevel;
  }

  const { error: updateError } = await supabase
    .from("listener_devices")
    .update(updateData)
    .eq("id", device.id);

  if (updateError) {
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Failed to update device heartbeat",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      deviceId: device.id,
      lastHeartbeatAt,
      batteryLevel: payloadValidation.data.batteryLevel ?? null,
    },
    { status: 200 }
  );
}
