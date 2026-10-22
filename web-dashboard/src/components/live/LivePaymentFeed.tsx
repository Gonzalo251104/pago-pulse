"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Radio, Sparkles, CheckCircle2, Filter } from "lucide-react";
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

  // 2. Fast local synchronization poll (< 1s latency for local simulator / fallback)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/v1/payments", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          payments: PaymentTransactionRow[];
          devices: ListenerDeviceRow[];
        };

        setDevices(data.devices);
        setPayments((prev) => {
          for (const item of data.payments) {
            if (!knownPaymentIdsRef.current.has(item.id)) {
              knownPaymentIdsRef.current.add(item.id);
              triggerNewPaymentAlert(item);
            }
          }
          return data.payments;
        });
      } catch {
        // Ignore transient network poll errors
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [triggerNewPaymentAlert]);

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

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (walletFilter !== "ALL" && p.wallet !== walletFilter) return false;
      return true;
    });
  }, [payments, statusFilter, walletFilter]);

  const unclaimedCount = useMemo(
    () => payments.filter((p) => p.status === "UNCLAIMED").length,
    [payments]
  );

  const totalAmountToday = useMemo(
    () => payments.reduce((acc, p) => acc + Number(p.amount), 0),
    [payments]
  );

  return (
    <div className="space-y-6">
      {/* Top Status Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:flex-row lg:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              EN VIVO
            </span>
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              Monitor de Caja en Tiempo Real
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Cada pago capturado en el celular del negocio aparece aquí en menos
            de 1 segundo. Nunca entregues mercadería solo por una captura de
            pantalla.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DeviceConnectionBadge device={devices[0] ?? null} />
          <TtsAnnouncerToggle
            enabled={ttsEnabled}
            onToggle={setTtsEnabled}
          />
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-xs font-medium text-slate-400">
            Pagos Pendientes de Atender
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-400">
              {unclaimedCount}
            </span>
            <span className="text-xs text-slate-500">por verificar en caja</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-xs font-medium text-slate-400">
            Total Recibido en Turno
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-400">
              S/ {totalAmountToday.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">
              ({payments.length} operaciones)
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-xs font-medium text-slate-400">
            Protección Antifraude
          </span>
          <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>Firma HMAC-SHA256 + Código Yape</span>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-1">
          {(
            [
              { id: "ALL", label: "Todos" },
              { id: "UNCLAIMED", label: `Por Atender (${unclaimedCount})` },
              { id: "CLAIMED", label: "Atendidos" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          {(["ALL", "YAPE", "PLIN"] as const).map((wallet) => (
            <button
              key={wallet}
              type="button"
              onClick={() => setWalletFilter(wallet)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                walletFilter === wallet
                  ? "border-slate-600 bg-slate-800 text-white"
                  : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              {wallet === "ALL" ? "Yape + Plin" : wallet}
            </button>
          ))}
        </div>
      </div>

      {/* Live Feed List */}
      <div className="space-y-3">
        {filteredPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 py-14 text-center">
            <CheckCircle2 className="h-8 w-8 text-slate-600" />
            <p className="mt-2 text-sm font-medium text-slate-300">
              No hay pagos en esta vista
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ejecuta `npm run simulate:payment` para enviar un pago Yape o Plin
              de prueba.
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

      <ClaimPaymentDialog
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
        onConfirmClaim={handleConfirmClaim}
      />
    </div>
  );
}
