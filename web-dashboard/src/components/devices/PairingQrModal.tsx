"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X, Copy, Check, ShieldCheck } from "lucide-react";
import type { ListenerDeviceRow } from "@/lib/supabase/types";

interface PairingQrModalProps {
  device: ListenerDeviceRow | null;
  onClose: () => void;
}

export function PairingQrModal({ device, onClose }: PairingQrModalProps) {
  const [copied, setCopied] = useState(false);

  if (!device) return null;

  const apiBaseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  const qrPayload = JSON.stringify({
    organizationId: device.organization_id,
    deviceId: device.id,
    deviceToken: device.id,
    deviceName: device.device_name,
    webhookSecret: device.webhook_secret,
    apiBaseUrl,
  });

  async function handleCopyPayload() {
    await navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="animate-modal-enter surface-card w-full max-w-md rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-emerald-400">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                Vincular Agente Android (QR)
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {device.device_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-tactile rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center rounded-2xl bg-white p-5">
          <QRCodeSVG
            value={qrPayload}
            size={208}
            level="M"
            includeMargin={false}
          />
          <span className="font-mono-tabular mt-2.5 text-[11px] text-zinc-600">
            ID: {device.id}
          </span>
        </div>

        <div className="surface-inset mt-4 space-y-1.5 rounded-xl p-3.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Emparejamiento Zero-Trust con HMAC-SHA256</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
            Abre la app Android <strong className="text-white">PagoPulse Agent</strong>{" "}
            en el celular donde recibes Yape y Plin y escanea este código QR.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopyPayload}
            className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.09]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>JSON Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar JSON</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn-tactile rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-300"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
