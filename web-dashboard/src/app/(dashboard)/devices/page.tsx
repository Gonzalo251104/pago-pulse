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
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            Teléfonos Vinculados y Estado del Agente
          </h1>
          <p className="text-xs text-slate-400">
            Vincula el celular Android donde recibes Yape y Plin mediante código
            QR y monitorea su batería en vivo.
          </p>
        </div>

        <DeviceConnectionBadge device={devices[0] ?? null} />
      </div>

      {/* Add Device Form */}
      <form
        onSubmit={handleCreateDevice}
        className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="device-name-input"
            className="block text-xs font-medium text-slate-300"
          >
            Vincular nuevo teléfono del negocio (Solo Dueño)
          </label>
          <input
            id="device-name-input"
            type="text"
            required
            value={newDeviceName}
            onChange={(e) => setNewDeviceName(e.target.value)}
            placeholder="Ej. Samsung A54 — Celular de Administración"
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-500 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-purple-400 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          <span>{creating ? "Generando QR..." : "Generar QR de Vínculo"}</span>
        </button>
      </form>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
          <Lock className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Devices Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {loading ? (
          <div className="col-span-full rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center text-xs text-slate-500">
            Cargando teléfonos vinculados...
          </div>
        ) : (
          devices.map((device) => (
            <div
              key={device.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">
                      {device.device_name}
                    </h3>
                    <p className="font-mono text-[11px] text-slate-500">
                      ID: {device.id}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    device.is_active
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {device.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-950/70 p-3 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <BatteryCharging className="h-4 w-4 text-emerald-400" />
                  <span>
                    Batería:{" "}
                    <strong>
                      {device.battery_level !== null
                        ? `${device.battery_level}%`
                        : "Sin reporte"}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="h-4 w-4 text-sky-400" />
                  <span>
                    Último ping:{" "}
                    <strong>
                      {device.last_heartbeat_at
                        ? new Date(device.last_heartbeat_at).toLocaleTimeString(
                            "es-PE",
                            { hour: "2-digit", minute: "2-digit" }
                          )
                        : "Pendiente"}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                <span className="text-[11px] text-slate-500">
                  Firma HMAC-SHA256 habilitada
                </span>
                <button
                  type="button"
                  onClick={() => setQrDevice(device)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/25"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Mostrar Código QR</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CLI Simulator helper card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <Terminal className="h-4 w-4" />
          <span>Prueba rápida desde terminal (Simulador CLI)</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Puedes simular la llegada de un Yape o Plin desde el dispositivo por
          defecto ejecutando:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-3 font-mono text-xs text-emerald-300">
          npm --prefix web-dashboard run simulate:payment -- --wallet=YAPE
          --amount=45.50 --sender=&quot;Carlos Mendoza&quot; --code=842
        </pre>
      </div>

      <PairingQrModal device={qrDevice} onClose={() => setQrDevice(null)} />
    </div>
  );
}
