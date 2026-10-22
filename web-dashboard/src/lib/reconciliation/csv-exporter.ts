import type { PaymentTransactionRow } from "@/lib/supabase/types";

export interface ReconciliationSummary {
  totalAmount: number;
  totalCount: number;
  yapeTotal: number;
  yapeCount: number;
  plinTotal: number;
  plinCount: number;
  claimedCount: number;
  unclaimedCount: number;
}

/**
 * Aggregates totals by wallet provider (YAPE vs PLIN) and claim status
 * for daily cash register reconciliation ("Cuadre de Caja").
 */
export function calculateReconciliationSummary(
  payments: PaymentTransactionRow[]
): ReconciliationSummary {
  let totalAmount = 0;
  let yapeTotal = 0;
  let yapeCount = 0;
  let plinTotal = 0;
  let plinCount = 0;
  let claimedCount = 0;
  let unclaimedCount = 0;

  for (const payment of payments) {
    const amount = Number(payment.amount);
    totalAmount += amount;

    if (payment.wallet === "YAPE") {
      yapeTotal += amount;
      yapeCount += 1;
    } else if (payment.wallet === "PLIN") {
      plinTotal += amount;
      plinCount += 1;
    }

    if (payment.status === "CLAIMED") {
      claimedCount += 1;
    } else if (payment.status === "UNCLAIMED") {
      unclaimedCount += 1;
    }
  }

  return {
    totalAmount: Number(totalAmount.toFixed(2)),
    totalCount: payments.length,
    yapeTotal: Number(yapeTotal.toFixed(2)),
    yapeCount,
    plinTotal: Number(plinTotal.toFixed(2)),
    plinCount,
    claimedCount,
    unclaimedCount,
  };
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an Excel-compatible UTF-8 CSV string (with BOM) for daily
 * accounting and cash reconciliation.
 */
export function generatePaymentsCsv(
  payments: PaymentTransactionRow[]
): string {
  const headers = [
    "Fecha Notificacion (ISO)",
    "Billetera",
    "Monto (PEN)",
    "Remitente",
    "Codigo Seguridad",
    "Estado",
    "Referencia Pedido",
    "ID Transaccion",
  ];

  const rows = payments.map((p) => {
    const statusLabel =
      p.status === "CLAIMED"
        ? "ATENDIDO"
        : p.status === "UNCLAIMED"
        ? "POR ATENDER"
        : "OBSERVADO";

    return [
      escapeCsvCell(p.notified_at),
      escapeCsvCell(p.wallet),
      escapeCsvCell(Number(p.amount).toFixed(2)),
      escapeCsvCell(p.sender_name),
      escapeCsvCell(p.security_code ?? ""),
      escapeCsvCell(statusLabel),
      escapeCsvCell(p.order_reference ?? ""),
      escapeCsvCell(p.id),
    ].join(",");
  });

  // Include UTF-8 BOM (\uFEFF) so Excel on Windows renders Spanish accents properly
  return `\uFEFF${[headers.join(","), ...rows].join("\r\n")}`;
}
