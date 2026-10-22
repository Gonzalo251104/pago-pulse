"use client";

import {
  CheckCircle2,
  Clock,
  ShieldAlert,
  KeyRound,
  Receipt,
} from "lucide-react";
import type { PaymentTransactionRow } from "@/lib/supabase/types";

interface PaymentCardProps {
  payment: PaymentTransactionRow;
  isHighlighted?: boolean;
  onClaimClick: (payment: PaymentTransactionRow) => void;
}

export function PaymentCard({
  payment,
  isHighlighted = false,
  onClaimClick,
}: PaymentCardProps) {
  const isYape = payment.wallet === "YAPE";
  const isUnclaimed = payment.status === "UNCLAIMED";

  const formattedTime = new Date(payment.notified_at).toLocaleTimeString(
    "es-PE",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );

  return (
    <article
      data-testid={`payment-card-${payment.id}`}
      className={`animate-payment-enter relative overflow-hidden rounded-xl pl-1.5 transition-all duration-300 ${
        isHighlighted
          ? "surface-card ring-2 ring-emerald-400/70"
          : isUnclaimed
          ? "surface-card hover:bg-[var(--bg-surface-hover)]"
          : "bg-white/[0.02] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)] opacity-75"
      }`}
    >
      {/* Left Vertical Status Accent Strip */}
      <div
        className={`absolute inset-y-0 left-0 w-1.5 ${
          !isUnclaimed
            ? "bg-zinc-700"
            : isYape
            ? "bg-[#9d4edd]"
            : "bg-cyan-400"
        }`}
      />

      <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:px-5">
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Top Metadata Row: Wallet + Security Code + Status + Time */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-extrabold tracking-wider ${
                isYape
                  ? "bg-[#9d4edd]/20 text-[#e0aaff] shadow-[inset_0_0_0_1px_rgba(157,78,221,0.35)]"
                  : "bg-cyan-400/15 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]"
              }`}
            >
              {payment.wallet}
            </span>

            {payment.security_code && (
              <span
                title="Código de seguridad de 3 dígitos de Yape"
                className="font-mono-tabular inline-flex items-center gap-1 rounded bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-300 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35)]"
              >
                <KeyRound className="h-3 w-3" />
                Cód: {payment.security_code}
              </span>
            )}

            {isUnclaimed ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-300">
                <Clock className="h-3 w-3" />
                POR ATENDER
              </span>
            ) : payment.status === "CLAIMED" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                ATENDIDO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-400/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-rose-300">
                <ShieldAlert className="h-3 w-3" />
                OBSERVADO
              </span>
            )}

            <span className="font-mono-tabular text-xs text-[var(--text-tertiary)]">
              · {formattedTime}
            </span>

            {payment.order_reference && (
              <span className="inline-flex items-center gap-1 rounded bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-zinc-200">
                <Receipt className="h-3 w-3 text-emerald-400" />
                Ref: {payment.order_reference}
              </span>
            )}
          </div>

          {/* Sender Name & Raw Notification */}
          <div>
            <h3 className="truncate text-base font-bold tracking-tight text-white sm:text-lg">
              {payment.sender_name}
            </h3>
            <p className="line-clamp-1 text-xs text-[var(--text-secondary)]">
              {payment.raw_notification}
            </p>
          </div>
        </div>

        {/* Right Column: Tabular Amount & Tactile Action */}
        <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] pt-3 sm:border-t-0 sm:pt-0">
          <div className="text-right">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              S/
            </span>{" "}
            <span className="font-mono-tabular text-2xl font-extrabold tracking-tight text-white sm:text-[1.7rem]">
              {Number(payment.amount).toFixed(2)}
            </span>
          </div>

          {isUnclaimed ? (
            <button
              type="button"
              onClick={() => onClaimClick(payment)}
              className="btn-tactile inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-400 px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.3)] hover:bg-emerald-300"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Atender Pago</span>
            </button>
          ) : (
            <span className="font-mono-tabular shrink-0 rounded-lg bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
              Verificado
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
