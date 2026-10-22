import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManageDevices, getCurrentSession } from "@/lib/auth/session";
import {
  createSupabaseServiceClient,
  isLiveSupabaseConfigured,
} from "@/lib/supabase/server";
import { registerLocalDevice } from "@/lib/supabase/local-store";

const createDeviceSchema = z.object({
  deviceName: z
    .string()
    .trim()
    .min(2, "El nombre del teléfono es obligatorio")
    .max(80, "El nombre del teléfono es demasiado largo"),
});

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!canManageDevices(session.role)) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Solo el dueño del negocio puede vincular nuevos teléfonos.",
      },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const parsed = createDeviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  if (isLiveSupabaseConfigured()) {
    const supabase = createSupabaseServiceClient();
    const webhookSecret = randomBytes(32).toString("hex");

    const { data, error } = await supabase
      .from("listener_devices")
      .insert({
        organization_id: session.organizationId,
        device_name: parsed.data.deviceName,
        webhook_secret: webhookSecret,
        is_active: true,
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "INTERNAL_ERROR", message: "No se pudo crear el dispositivo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ device: data }, { status: 201 });
  }

  const created = registerLocalDevice(
    parsed.data.deviceName,
    session.organizationId
  );

  return NextResponse.json({ device: created }, { status: 201 });
}
