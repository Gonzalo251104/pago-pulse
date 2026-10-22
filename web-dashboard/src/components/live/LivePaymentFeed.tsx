"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import type {
  ListenerDeviceRow,
  PaymentTransactionRow,
  WalletProvider,
} from "@/lib/supabase/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  playPaymentChime,
  speakPaymentAnnouncement,
} from "@/lib/audio/payment-announcer";
import { PaymentCard } from "@/components/live/PaymentCard";
import { ClaimPaymentDialog } from "@/components/live/ClaimPaymentDialog";
import { TtsAnnouncerToggle } from "@/components/live/TtsAnnouncerToggle";
import { DeviceConnectionBadge } from "@/components/devices/DeviceConnectionBadge";

interface LivePaymentFeedProps {
  initialPayments: PaymentTransactionRow[];
  initialDevices: ListenerDeviceRow[];
  organizationId: string;
}

type StatusFilter = "ALL" | "UNCLAIMED" | "CLAIMED";

export function LivePaymentFeed({
  initialPayments,
  initialDevices,
  organizationId,
}: LivePaymentFeedProps) {
  const [payments, setPayments] =
    useState<PaymentTransactionRow[]>(initialPayments);
  const [devices, setDevices] = useState<ListenerDeviceRow[]>(initialDevices);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [walletFilter, setWalletFilter] = useState<"ALL" | WalletProvider>(
    "ALL"
  );
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentTransactionRow | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [simulatingWallet, setSimulatingWallet] =
    useState<WalletProvider | null>(null);

  const knownPaymentIdsRef = useRef<Set<string>>(
    new Set(initialPayments.map((p) => p.id))
  );
  const ttsEnabledRef = useRef<boolean>(ttsEnabled);
  ttsEnabledRef.current = ttsEnabled;

  const triggerNewPaymentAlert = useCallback(
    (newPayment: PaymentTransactionRow) => {
      setHighlightedId(newPayment.id);
      playPaymentChime();
      if (ttsEnabledRef.current) {
        speakPaymentAnnouncement(
          newPayment.wallet,
          newPayment.sender_name,
          Number(newPayment.amount)
        );
      }
      setTimeout(() => {
        setHighlightedId((current) =>
          current === newPayment.id ? null : current
        );
      }, 6000);
    },
    []
  );

  // 1. Subscribe to Supabase Realtime (`payment_transactions`) when configured
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      supabaseAnonKey === "your-supabase-anon-key"
    ) {
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const channel = supabase
        .channel(`org-payments-${organizationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "payment_transactions",
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload) => {
            const incoming = payload.new as PaymentTransactionRow;
            if (!knownPaymentIdsRef.current.has(incoming.id)) {
              knownPaymentIdsRef.current.add(incoming.id);
              setPayments((prev) => [incoming, ...prev]);
              triggerNewPaymentAlert(incoming);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "payment_transactions",
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload) => {
            const updated = payload.new as PaymentTransactionRow;
            setPayments((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      return;
    }
  }, [organizationId, triggerNewPaymentAlert]);

  // 2. Fast local synchronization poll (< 1s latency for CLI simulator & browser simulator)
  const refreshPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/payments", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        payments: PaymentTransactionRow[];
        devices: ListenerDeviceRow[];
      };

      setDevices(data.devices);
      setPayments(() => {
        for (const item of data.payments) {
          if (!knownPaymentIdsRef.current.has(item.id)) {
            knownPaymentIdsRef.current.add(item.id);
            triggerNewPaymentAlert(item);
          }
        }
        return data.payments;
      });
    } catch {
      // Ignore transient poll errors
    }
  }, [triggerNewPaymentAlert]);

  useEffect(() => {
    const interval = setInterval(refreshPayments, 1000);
    return () => clearInterval(interval);
  }, [refreshPayments]);

  async function handleConfirmClaim(
    paymentId: string,
    orderReference: string | null
  ) {
    const response = await fetch(`/api/v1/payments/${paymentId}/claim`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderReference, status: "CLAIMED" }),
    });

    if (response.ok) {
      const { payment: updated } = (await response.json()) as {
        payment: PaymentTransactionRow;
      };
      setPayments((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
    }
  }

  async function handleSimulateInBrowser(wallet: WalletProvider) {
    setSimulatingWallet(wallet);
    try {
      await fetch("/api/v1/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      await refreshPayments();
    } finally {
      setSimulatingWallet(null);
    }
  }

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (walletFilter !== "ALL" && p.wallet !== walletFilter) return false;
      return true;
    });
  }, [payments, statusFilter, walletFilter]);

  const metrics = useMemo(() => {
    let unclaimedCount = 0;
    let totalAmount = 0;
    let yapeTotal = 0;
    let plinTotal = 0;

    for (const p of payments) {
      const amt = Number(p.amount);
      totalAmount += amt;
      if (p.status === "UNCLAIMED") unclaimedCount += 1;
      if (p.wallet === "YAPE") yapeTotal += amt;
      if (p.wallet === "PLIN") plinTotal += amt;
    }

    return {
      unclaimedCount,
      totalAmount,
      yapeTotal,
      plinTotal,
    };
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Compact POS Top Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.065] pb-5 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="font-mono-tabular text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
              Recepción Instantánea Activa
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-white">
            Monitor de Caja en Tiempo Real
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <DeviceConnectionBadge device={devices[0] ?? null} />
          <TtsAnnouncerToggle
            enabled={ttsEnabled}
            onToggle={setTtsEnabled}
          />
        </div>
      </div>

      {/* Asymmetric 12-Column POS Split Layout (8 cols stream + 4 cols register rail) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left 8 Columns: Filter Strip & Live Transaction Stream */}
        <div className="space-y-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Filter Segmented Control */}
            <div className="inline-flex items-center gap-1 rounded-lg bg-white/[0.03] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              {(
                [
                  { id: "ALL", label: "Todos" },
                  {
                    id: "UNCLAIMED",
                    label: `Por Atender (${metrics.unclaimedCount})`,
                  },
                  { id: "CLAIMED", label: "Atendidos" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`btn-tactile rounded-md px-3 py-1.5 text-xs font-semibold ${
                    statusFilter === tab.id
                      ? "bg-white text-zinc-950 shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Wallet Filter Pills */}
            <div className="inline-flex items-center gap-1.5">
              {(["ALL", "YAPE", "PLIN"] as const).map((wallet) => (
                <button
                  key={wallet}
                  type="button"
                  onClick={() => setWalletFilter(wallet)}
                  className={`btn-tactile rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                    walletFilter === wallet
                      ? "bg-white/[0.1] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
                      : "bg-white/[0.03] text-[var(--text-secondary)] hover:text-white"
                  }`}
                >
                  {wallet === "ALL" ? "Yape + Plin" : wallet}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction List */}
          <div className="space-y-2.5">
            {filteredPayments.length === 0 ? (
              <div className="surface-inset flex flex-col items-center justify-center rounded-2xl py-16 text-center">
                <CheckCircle2 className="h-7 w-7 text-zinc-600" />
                <p className="mt-2.5 text-sm font-semibold text-zinc-300">
                  Sin pagos en este filtro
                </p>
                <p className="mt-1 max-w-xs text-xs text-[var(--text-secondary)]">
                  Usa el simulador en el panel derecho o ejecuta{" "}
                  <code className="font-mono-tabular text-zinc-300">
                    npm run simulate:payment
                  </code>{" "}
                  para probar un cobro en vivo.
                </p>
              </div>
            ) : (
              filteredPayments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  isHighlighted={highlightedId === payment.id}
                  onClaimClick={setSelectedPayment}
                />
              ))
            )}
          </div>
        </div>

        {/* Right 4 Columns: Sticky Cash Register Ledger & Instant Simulator */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:col-span-4">
          {/* Shift Cash Register Card */}
          <div className="surface-card rounded-2xl p-5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Arqueo de Turno Actual
              </span>
              <span className="font-mono-tabular text-xs text-[var(--text-tertiary)]">
                {payments.length} ops
              </span>
            </div>

            <div className="mt-4">
              <span className="text-xs text-[var(--text-secondary)]">
                Total verificado en caja
              </span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-[var(--text-secondary)]">
                  S/
                </span>
                <span className="font-mono-tabular text-3xl font-extrabold tracking-tight text-white">
                  {metrics.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Yape vs Plin Breakdown Rows */}
            <div className="mt-5 space-y-2.5 border-t border-white/[0.06] pt-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <span className="h-2 w-2 rounded-full bg-[#9d4edd]" />
                  Subtotal Yape
                </span>
                <span className="font-mono-tabular font-bold text-white">
                  S/ {metrics.yapeTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  Subtotal Plin
                </span>
                <span className="font-mono-tabular font-bold text-white">
                  S/ {metrics.plinTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Pendientes por atender
                </span>
                <span className="font-mono-tabular font-bold text-amber-300">
                  {metrics.unclaimedCount}
                </span>
              </div>
            </div>

            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <Link
                href="/history"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 transition hover:text-emerald-300"
              >
                <span>Ir a cierre de caja y exportar CSV</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Interactive Browser Webhook Simulator */}
          <div className="surface-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              <span>Simulador de Cobro en Vivo</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
              Dispara un webhook firmado con{" "}
              <code className="font-mono-tabular text-[11px] text-zinc-300">
                HMAC-SHA256
              </code>{" "}
              para probar la llegada instantánea y el anuncio por voz:
            </p>

            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={simulatingWallet !== null}
                onClick={() => handleSimulateInBrowser("YAPE")}
                className="btn-tactile flex items-center justify-center gap-1.5 rounded-xl bg-[#9d4edd]/20 px-3 py-2.5 text-xs font-bold text-[#e0aaff] shadow-[inset_0_0_0_1px_rgba(157,78,221,0.4)] hover:bg-[#9d4edd]/30 disabled:opacity-50"
              >
                <span>
                  {simulatingWallet === "YAPE"
                    ? "Enviando..."
                    : "+ Simular Yape"}
                </span>
              </button>

              <button
                type="button"
                disabled={simulatingWallet !== null}
                onClick={() => handleSimulateInBrowser("PLIN")}
                className="btn-tactile flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400/15 px-3 py-2.5 text-xs font-bold text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)] hover:bg-cyan-400/25 disabled:opacity-50"
              >
                <span>
                  {simulatingWallet === "PLIN"
                    ? "Enviando..."
                    : "+ Simular Plin"}
                </span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      <ClaimPaymentDialog
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
        onConfirmClaim={handleConfirmClaim}
      />
    </div>
  );
}
