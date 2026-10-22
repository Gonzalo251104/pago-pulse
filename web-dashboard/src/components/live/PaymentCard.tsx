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
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
        isHighlighted
          ? "border-emerald-400 bg-emerald-950/30 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-400/50"
          : isUnclaimed
          ? "border-slate-800 bg-slate-900/90 hover:border-slate-700"
          : "border-slate-900 bg-slate-900/40 opacity-80"
      }`}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          {/* Wallet Badge */}
          <div
            className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl font-extrabold tracking-tight shadow-inner ${
              isYape
                ? "bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/40"
                : "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/40"
            }`}
          >
            <span className="text-xs">{payment.wallet}</span>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white">
                {payment.sender_name}
              </h3>

              {payment.security_code && (
                <span
                  title="Código de seguridad de 3 dígitos de Yape"
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/30"
                >
                  <KeyRound className="h-3 w-3" />
                  Cód: {payment.security_code}
                </span>
              )}

              {isUnclaimed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
                  <Clock className="h-3 w-3" />
                  POR ATENDER
                </span>
              ) : payment.status === "CLAIMED" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3" />
                  ATENDIDO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-500/30">
                  <ShieldAlert className="h-3 w-3" />
                  OBSERVADO
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400">{payment.raw_notification}</p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
              <span>Hora: {formattedTime}</span>
              {payment.order_reference && (
                <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 font-medium text-slate-300">
                  <Receipt className="h-3 w-3 text-emerald-400" />
                  Ref: {payment.order_reference}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Amount + Action */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
          <div className="text-right">
            <span className="text-xs font-medium text-slate-400">S/</span>{" "}
            <span className="text-2xl font-extrabold tracking-tight text-emerald-400 sm:text-3xl">
              {Number(payment.amount).toFixed(2)}
            </span>
          </div>

          {isUnclaimed ? (
            <button
              type="button"
              onClick={() => onClaimClick(payment)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-emerald-400 active:scale-[0.99]"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Atender Pago</span>
            </button>
          ) : (
            <span className="text-[11px] font-medium text-slate-500">
              Verificado en caja
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
