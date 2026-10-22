"use client";

import { Smartphone, BatteryCharging, WifiOff } from "lucide-react";
import type { ListenerDeviceRow } from "@/lib/supabase/types";

interface DeviceConnectionBadgeProps {
  device: ListenerDeviceRow | null;
}

export function DeviceConnectionBadge({ device }: DeviceConnectionBadgeProps) {
  if (!device) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.25)]">
        <WifiOff className="h-3.5 w-3.5" />
        <span>Sin teléfono vinculado</span>
      </div>
    );
  }

  const lastHeartbeatMs = device.last_heartbeat_at
    ? Date.now() - new Date(device.last_heartbeat_at).getTime()
    : Infinity;

  const isOnline = device.is_active && lastHeartbeatMs < 10 * 60 * 1000;

  return (
    <div className="inline-flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
      <span
        className={`h-2 w-2 rounded-full ${
          isOnline
            ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
            : "bg-amber-400"
        }`}
      />
      <Smartphone className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
      <span className="max-w-[190px] truncate font-medium">
        {device.device_name}
      </span>

      {device.battery_level !== null && (
        <span className="font-mono-tabular inline-flex items-center gap-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-zinc-300">
          <BatteryCharging className="h-3 w-3 text-emerald-400" />
          {device.battery_level}%
        </span>
      )}
    </div>
  );
}
