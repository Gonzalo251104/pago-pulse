import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createSupabaseServerClient,
  isLiveSupabaseConfigured,
} from "@/lib/supabase/server";
import { readLocalStore } from "@/lib/supabase/local-store";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (isLiveSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const [{ data: payments }, { data: devices }] = await Promise.all([
        supabase
          .from("payment_transactions")
          .select("*")
          .eq("organization_id", session.organizationId)
          .order("notified_at", { ascending: false })
          .limit(200),
        supabase
          .from("listener_devices")
          .select("*")
          .eq("organization_id", session.organizationId)
          .order("created_at", { ascending: false }),
      ]);

      return NextResponse.json({
        payments: payments ?? [],
        devices: devices ?? [],
      });
    } catch {
      // Fall back to local store if live query fails
    }
  }

  const store = readLocalStore();
  return NextResponse.json({
    payments: store.payments,
    devices: store.devices,
  });
}
