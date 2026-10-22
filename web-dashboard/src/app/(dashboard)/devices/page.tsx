"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  QrCode,
  Plus,
  BatteryCharging,
  Clock,
  Lock,
  Terminal,
} from "lucide-react";
import type { ListenerDeviceRow } from "@/lib/supabase/types";
import { PairingQrModal } from "@/components/devices/PairingQrModal";
import { DeviceConnectionBadge } from "@/components/devices/DeviceConnectionBadge";

export default function DevicesPage() {
  const [devices, setDevices] = useState<ListenerDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qrDevice, setQrDevice] = useState<ListenerDeviceRow | null>(null);

  useEffect(() => {
    async function fetchDevices() {
      try {
        const res = await fetch("/api/v1/payments", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { devices: ListenerDeviceRow[] };
          setDevices(data.devices);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchDevices();
  }, []);

  async function handleCreateDevice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newDeviceName.trim()) return;
    setCreating(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceName: newDeviceName.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(
          data.message ??
            "No tienes permisos para vincular teléfonos (se requiere Rol: Dueño)."
        );
        return;
      }

      const created = data.device as ListenerDeviceRow;
      setDevices((prev) => [created, ...prev]);
      setNewDeviceName("");
      setQrDevice(created);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.065] pb-5 sm:flex-row sm:items-end">
        <div>
          <span className="font-mono-tabular text-[11px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
            Telemetría y Emparejamiento QR
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-white">
            Teléfonos Vinculados al Comercio
          </h1>
        </div>

        <DeviceConnectionBadge device={devices[0] ?? null} />
      </div>

      {/* Asymmetric 12-Col Layout: 7 Cols Device List + 5 Cols Owner Pairing & CLI */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          {loading ? (
            <div className="surface-inset rounded-2xl p-10 text-center text-xs text-[var(--text-secondary)]">
              Consultando estado de dispositivos...
            </div>
          ) : (
            devices.map((device) => (
              <div
                key={device.id}
                className="surface-card flex flex-col justify-between gap-4 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-emerald-400">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">
                        {device.device_name}
                      </h3>
                      <p className="font-mono-tabular text-[11px] text-[var(--text-tertiary)]">
                        {device.id}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      device.is_active
                        ? "bg-emerald-400/15 text-emerald-300"
                        : "bg-white/[0.06] text-zinc-400"
                    }`}
                  >
                    {device.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div className="surface-inset grid grid-cols-2 gap-3 rounded-xl p-3 text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <BatteryCharging className="h-4 w-4 text-emerald-400" />
                    <span>
                      Batería:{" "}
                      <strong className="font-mono-tabular text-white">
                        {device.battery_level !== null
                          ? `${device.battery_level}%`
                          : "—"}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-300">
                    <Clock className="h-4 w-4 text-sky-400" />
                    <span>
                      Último ping:{" "}
                      <strong className="font-mono-tabular text-white">
                        {device.last_heartbeat_at
                          ? new Date(
                              device.last_heartbeat_at
                            ).toLocaleTimeString("es-PE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Pendiente"}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className="font-mono-tabular text-[11px] text-[var(--text-tertiary)]">
                    HMAC-SHA256 · 256-bit secret
                  </span>
                  <button
                    type="button"
                    onClick={() => setQrDevice(device)}
                    className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.11]"
                  >
                    <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Mostrar Código QR</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right 5 Cols: Add New Device Form + CLI Command Reference */}
        <aside className="space-y-4 lg:col-span-5">
          <form
            onSubmit={handleCreateDevice}
            className="surface-card space-y-4 rounded-2xl p-5"
          >
            <div>
              <h2 className="text-sm font-bold text-white">
                Vincular nuevo teléfono (Solo Dueño)
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Genera una clave criptográfica única y un código QR para
                emparejar el aplicativo Android.
              </p>
            </div>

            <div>
              <label
                htmlFor="device-name-input"
                className="block text-xs font-medium text-zinc-300"
              >
                Nombre identificador del equipo
              </label>
              <input
                id="device-name-input"
                type="text"
                required
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="Ej. Samsung A54 — Caja 2"
                className="surface-inset mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
              />
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.3)]">
                <Lock className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="btn-tactile inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>
                {creating ? "Generando QR..." : "Generar QR de Vínculo"}
              </span>
            </button>
          </form>

          <div className="surface-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              <span>Simulador por Línea de Comandos</span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              También puedes enviar webhooks firmados desde terminal:
            </p>
            <pre className="surface-inset font-mono-tabular mt-2.5 overflow-x-auto rounded-xl p-3 text-[11px] leading-relaxed text-emerald-300">
              npm --prefix web-dashboard run simulate:payment -- --wallet=YAPE
              --amount=45.50 --sender=&quot;Carlos Mendoza&quot; --code=842
            </pre>
          </div>
        </aside>
      </div>

      <PairingQrModal device={qrDevice} onClose={() => setQrDevice(null)} />
    </div>
  );
}
