import type { WalletProvider } from "@/lib/supabase/types";

/**
 * Formats an incoming payment into a natural Spanish voice announcement
 * for the cashier.
 *
 * Example:
 *   formatSpanishPaymentAnnouncement("YAPE", "Carlos Mendoza", 45.50)
 *   => "Yape recibido de Carlos Mendoza por 45 soles con 50 céntimos"
 */
export function formatSpanishPaymentAnnouncement(
  wallet: WalletProvider,
  senderName: string,
  amount: number
): string {
  const walletLabel = wallet === "PLIN" ? "Plin" : "Yape";
  const cleanSender = senderName.trim() || "Cliente";

  const totalCents = Math.round(Number(amount) * 100);
  const soles = Math.floor(totalCents / 100);
  const cents = totalCents % 100;

  const solesLabel = soles === 1 ? "1 sol" : `${soles} soles`;

  if (cents === 0) {
    return `${walletLabel} recibido de ${cleanSender} por ${solesLabel}`;
  }

  const paddedCents = String(cents).padStart(2, "0");
  return `${walletLabel} recibido de ${cleanSender} por ${solesLabel} con ${paddedCents} céntimos`;
}

/**
 * Synthesizes a pleasant two-tone notification chime using the browser's
 * native Web Audio API (`AudioContext`) without requiring external audio files.
 */
export function playPaymentChime(): void {
  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First note: A5 (880 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    // Second note: E6 (1318.51 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1318.51, now + 0.14);
    gain2.gain.setValueAtTime(0.22, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.45);
  } catch {
    // Ignore autoplay errors if user has not interacted with the page yet
  }
}

/**
 * Speaks a Spanish payment announcement using the browser's Web Speech API.
 */
export function speakPaymentAnnouncement(
  wallet: WalletProvider,
  senderName: string,
  amount: number
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    const text = formatSpanishPaymentAnnouncement(wallet, senderName, amount);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-PE";
    utterance.rate = 1.02;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.toLowerCase() === "es-pe") ??
      voices.find((v) => v.lang.toLowerCase().startsWith("es-419")) ??
      voices.find((v) => v.lang.toLowerCase().startsWith("es"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech synthesis errors on unsupported browsers
  }
}
