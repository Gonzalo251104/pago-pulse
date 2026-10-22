"use client";

import { Volume2, VolumeX, Play } from "lucide-react";
import {
  playPaymentChime,
  speakPaymentAnnouncement,
} from "@/lib/audio/payment-announcer";

interface TtsAnnouncerToggleProps {
  enabled: boolean;
  onToggle: (nextValue: boolean) => void;
}

export function TtsAnnouncerToggle({
  enabled,
  onToggle,
}: TtsAnnouncerToggleProps) {
  function handleTestVoice() {
    playPaymentChime();
    speakPaymentAnnouncement("YAPE", "Carlos Mendoza", 45.5);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          const next = !enabled;
          onToggle(next);
          if (next) {
            playPaymentChime();
          }
        }}
        className={`btn-tactile inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
          enabled
            ? "bg-emerald-400/15 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.35)] hover:bg-emerald-400/20"
            : "bg-white/[0.04] text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:text-white"
        }`}
      >
        {enabled ? (
          <>
            <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Altavoz TTS: Activo</span>
          </>
        ) : (
          <>
            <VolumeX className="h-3.5 w-3.5 text-zinc-500" />
            <span>Altavoz TTS: Silenciado</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleTestVoice}
        title="Reproducir anuncio de prueba en español"
        className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-white/[0.08] hover:text-white"
      >
        <Play className="h-3 w-3 text-emerald-400" />
        <span>Probar voz</span>
      </button>
    </div>
  );
}
