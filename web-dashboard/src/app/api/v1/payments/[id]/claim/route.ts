import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createSupabaseServiceClient,
  isLiveSupabaseConfigured,
} from "@/lib/supabase/server";
import { claimLocalPayment } from "@/lib/supabase/local-store";

const claimPaymentSchema = z.object({
  orderReference: z
    .string()
    .trim()
    .max(80, "La referencia es demasiado larga")
    .nullable()
    .optional(),
  status: z.enum(["CLAIMED", "FLAGGED"]).optional().default("CLAIMED"),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Allow empty body for quick one-click claim
  }

  const parsed = claimPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const orderReference = parsed.data.orderReference?.trim() || null;
  const status = parsed.data.status;

  if (isLiveSupabaseConfigured()) {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("payment_transactions")
      .update({
        status,
        order_reference: orderReference,
        claimed_by: session.userId,
        claimed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", session.organizationId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "No se encontró la transacción" },
        { status: 404 }
      );
    }

    return NextResponse.json({ payment: data }, { status: 200 });
  }

  const updated = claimLocalPayment(
    id,
    orderReference,
    session.userId,
    status
  );

  if (!updated) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "No se encontró la transacción" },
      { status: 404 }
    );
  }

  return NextResponse.json({ payment: updated }, { status: 200 });
}
