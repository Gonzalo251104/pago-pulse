"use client";

import { Smartphone, BatteryCharging, Wifi, WifiOff } from "lucide-react";
import type { ListenerDeviceRow } from "@/lib/supabase/types";

interface DeviceConnectionBadgeProps {
  device: ListenerDeviceRow | null;
}

export function DeviceConnectionBadge({ device }: DeviceConnectionBadgeProps) {
  if (!device) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
        <WifiOff className="h-3.5 w-3.5" />
        <span>Sin teléfono vinculado</span>
      </div>
    );
  }

  const lastHeartbeatMs = device.last_heartbeat_at
    ? Date.now() - new Date(device.last_heartbeat_at).getTime()
    : Infinity;

  // Consider device online if heartbeat occurred within the last 10 minutes
  const isOnline = device.is_active && lastHeartbeatMs < 10 * 60 * 1000;

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-xl border px-3 py-1.5 text-xs font-medium ${
        isOnline
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-300"
      }`}
    >
      <span className="relative flex h-2 w-2">
        {isOnline && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            isOnline ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />
      </span>

      <Smartphone className="h-3.5 w-3.5" />
      <span className="max-w-[180px] truncate">{device.device_name}</span>

      {device.battery_level !== null && (
        <span className="inline-flex items-center gap-1 rounded bg-slate-900/80 px-1.5 py-0.5 text-[11px] text-slate-300">
          <BatteryCharging className="h-3 w-3 text-emerald-400" />
          {device.battery_level}%
        </span>
      )}

      <Wifi className="h-3.5 w-3.5 opacity-80" />
    </div>
  );
}
