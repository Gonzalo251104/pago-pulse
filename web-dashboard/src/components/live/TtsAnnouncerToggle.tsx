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
        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold ring-1 transition ${
          enabled
            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40 hover:bg-emerald-500/25"
            : "bg-slate-900 text-slate-400 ring-slate-800 hover:text-slate-200"
        }`}
      >
        {enabled ? (
          <>
            <Volume2 className="h-4 w-4 text-emerald-400" />
            <span>Altavoz TTS: Activo</span>
          </>
        ) : (
          <>
            <VolumeX className="h-4 w-4 text-slate-500" />
            <span>Altavoz TTS: Silenciado</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handleTestVoice}
        title="Reproducir anuncio de prueba en español"
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
      >
        <Play className="h-3.5 w-3.5 text-emerald-400" />
        <span>Probar voz</span>
      </button>
    </div>
  );
}
