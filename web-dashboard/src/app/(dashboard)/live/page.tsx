import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createSupabaseServerClient,
  isLiveSupabaseConfigured,
} from "@/lib/supabase/server";
import { readLocalStore } from "@/lib/supabase/local-store";
import { LivePaymentFeed } from "@/components/live/LivePaymentFeed";

export const dynamic = "force-dynamic";

export default async function LiveCashierPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  let initialPayments = readLocalStore().payments;
  let initialDevices = readLocalStore().devices;

  if (isLiveSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const [{ data: payments }, { data: devices }] = await Promise.all([
        supabase
          .from("payment_transactions")
          .select("*")
          .eq("organization_id", session.organizationId)
          .order("notified_at", { ascending: false })
          .limit(50),
        supabase
          .from("listener_devices")
          .select("*")
          .eq("organization_id", session.organizationId)
          .order("created_at", { ascending: false }),
      ]);

      if (payments) initialPayments = payments;
      if (devices) initialDevices = devices;
    } catch {
      // Fallback to local store
    }
  }

  return (
    <LivePaymentFeed
      initialPayments={initialPayments}
      initialDevices={initialDevices}
      organizationId={session.organizationId}
    />
  );
}
