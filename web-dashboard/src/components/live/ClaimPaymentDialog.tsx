"use client";

import { useState } from "react";
import { CheckCircle2, X, Receipt } from "lucide-react";
import type { PaymentTransactionRow } from "@/lib/supabase/types";

interface ClaimPaymentDialogProps {
  payment: PaymentTransactionRow | null;
  onClose: () => void;
  onConfirmClaim: (
    paymentId: string,
    orderReference: string | null
  ) => Promise<void>;
}

const QUICK_REFERENCES = [
  "Mostrador",
  "Mesa 1",
  "Mesa 2",
  "Mesa 3",
  "Mesa 4",
  "Para llevar",
  "Delivery",
];

export function ClaimPaymentDialog({
  payment,
  onClose,
  onConfirmClaim,
}: ClaimPaymentDialogProps) {
  const [orderReference, setOrderReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!payment) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payment) return;
    setSubmitting(true);
    try {
      await onConfirmClaim(payment.id, orderReference.trim() || null);
      setOrderReference("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-400">
              {payment.wallet} • S/ {Number(payment.amount).toFixed(2)}
            </span>
            <h2
              id="claim-dialog-title"
              className="mt-2 text-lg font-bold text-white"
            >
              Confirmar atención de pago
            </h2>
            <p className="text-xs text-slate-400">
              Remitente:{" "}
              <strong className="text-slate-200">{payment.sender_name}</strong>
              {payment.security_code
                ? ` • Código: ${payment.security_code}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="order-reference-input"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300"
            >
              <Receipt className="h-3.5 w-3.5 text-emerald-400" />
              <span>Número de ticket, mesa o pedido (opcional)</span>
            </label>
            <input
              id="order-reference-input"
              type="text"
              autoFocus
              value={orderReference}
              onChange={(e) => setOrderReference(e.target.value)}
              placeholder="Ej. Mesa 4, Boleta B001-428, Pedido #12"
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-400">
              Selección rápida:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REFERENCES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setOrderReference(preset)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                    orderReference === preset
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {submitting ? "Guardando..." : "Confirmar y Marcar Atendido"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
