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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Vincular Agente Android (QR)
              </h2>
              <p className="text-xs text-slate-400">{device.device_name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center rounded-2xl bg-white p-5">
          <QRCodeSVG
            value={qrPayload}
            size={210}
            level="M"
            includeMargin={false}
          />
          <span className="mt-2 font-mono text-[11px] text-slate-600">
            ID: {device.id}
          </span>
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Emparejamiento Zero-Trust con HMAC-SHA256</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Abre la app Android <strong>PagoPulse Agent</strong> en el teléfono
            del dueño y escanea este código QR. La clave secreta se guardará en{" "}
            <code>EncryptedSharedPreferences</code>.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopyPayload}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>JSON Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar JSON de emparejamiento</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
