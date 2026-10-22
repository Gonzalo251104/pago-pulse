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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="animate-modal-enter surface-card w-full max-w-md rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="font-mono-tabular inline-flex items-center rounded bg-emerald-400/15 px-2 py-0.5 text-xs font-bold text-emerald-300">
              {payment.wallet} · S/ {Number(payment.amount).toFixed(2)}
            </span>
            <h2
              id="claim-dialog-title"
              className="mt-2 text-lg font-bold tracking-tight text-white"
            >
              Confirmar atención de pago
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Cliente:{" "}
              <strong className="font-semibold text-white">
                {payment.sender_name}
              </strong>
              {payment.security_code
                ? ` · Cód: ${payment.security_code}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-tactile rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="order-reference-input"
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
            >
              <Receipt className="h-3.5 w-3.5 text-emerald-400" />
              <span>Mesa, pedido o comprobante (opcional)</span>
            </label>
            <input
              id="order-reference-input"
              type="text"
              autoFocus
              value={orderReference}
              onChange={(e) => setOrderReference(e.target.value)}
              placeholder="Ej. Mesa 4, Boleta B001-428, Pedido #12"
              className="surface-inset mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Asignación rápida:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REFERENCES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setOrderReference(preset)}
                  className={`btn-tactile rounded-lg px-2.5 py-1 text-xs font-medium ${
                    orderReference === preset
                      ? "bg-emerald-400/20 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.45)]"
                      : "bg-white/[0.04] text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] hover:text-white"
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
              className="btn-tactile rounded-lg bg-white/[0.04] px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/[0.08]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-300 disabled:opacity-50"
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
