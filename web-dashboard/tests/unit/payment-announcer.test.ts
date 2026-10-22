import { describe, expect, it } from "vitest";
import { formatSpanishPaymentAnnouncement } from "@/lib/audio/payment-announcer";

describe("formatSpanishPaymentAnnouncement", () => {
  it("formats a Yape payment with soles and cents accurately", () => {
    const phrase = formatSpanishPaymentAnnouncement(
      "YAPE",
      "Carlos Mendoza",
      45.5
    );
    expect(phrase).toBe(
      "Yape recibido de Carlos Mendoza por 45 soles con 50 céntimos"
    );
  });

  it("formats a Plin payment with exact integer soles without cents suffix", () => {
    const phrase = formatSpanishPaymentAnnouncement(
      "PLIN",
      "Lucía Fernández",
      120
    );
    expect(phrase).toBe("Plin recibido de Lucía Fernández por 120 soles");
  });

  it("uses singular '1 sol' when the integer amount is 1", () => {
    expect(formatSpanishPaymentAnnouncement("YAPE", "Juan Pérez", 1)).toBe(
      "Yape recibido de Juan Pérez por 1 sol"
    );
    expect(formatSpanishPaymentAnnouncement("YAPE", "Juan Pérez", 1.2)).toBe(
      "Yape recibido de Juan Pérez por 1 sol con 20 céntimos"
    );
  });
});
