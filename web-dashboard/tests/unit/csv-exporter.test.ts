import { describe, expect, it } from "vitest";
import {
  calculateReconciliationSummary,
  generatePaymentsCsv,
} from "@/lib/reconciliation/csv-exporter";
import type { PaymentTransactionRow } from "@/lib/supabase/types";

const samplePayments: PaymentTransactionRow[] = [
  {
    id: "p-1",
    organization_id: "org-1",
    device_id: "dev-1",
    idempotency_key: "k-1",
    wallet: "YAPE",
    amount: 45.5,
    currency: "PEN",
    sender_name: "Carlos Mendoza",
    security_code: "842",
    raw_notification: "Yape S/ 45.50",
    status: "CLAIMED",
    order_reference: "Mesa 4",
    claimed_by: "u-1",
    notified_at: "2026-10-21T22:30:00Z",
    claimed_at: "2026-10-21T22:31:00Z",
    created_at: "2026-10-21T22:30:00Z",
  },
  {
    id: "p-2",
    organization_id: "org-1",
    device_id: "dev-1",
    idempotency_key: "k-2",
    wallet: "PLIN",
    amount: 30.0,
    currency: "PEN",
    sender_name: 'Lucía "Lucy" Fernández, S.A.',
    security_code: null,
    raw_notification: "Plin S/ 30.00",
    status: "UNCLAIMED",
    order_reference: null,
    claimed_by: null,
    notified_at: "2026-10-21T22:45:00Z",
    claimed_at: null,
    created_at: "2026-10-21T22:45:00Z",
  },
];

describe("csv-exporter & reconciliation summary", () => {
  it("computes daily totals by wallet (Yape vs Plin) and claim status", () => {
    const summary = calculateReconciliationSummary(samplePayments);

    expect(summary).toEqual({
      totalAmount: 75.5,
      totalCount: 2,
      yapeTotal: 45.5,
      yapeCount: 1,
      plinTotal: 30.0,
      plinCount: 1,
      claimedCount: 1,
      unclaimedCount: 1,
    });
  });

  it("exports UTF-8 BOM CSV with escaped quotes and commas", () => {
    const csv = generatePaymentsCsv(samplePayments);

    expect(csv.startsWith("\uFEFFFecha Notificacion (ISO)")).toBe(true);
    expect(csv).toContain("YAPE,45.50,Carlos Mendoza,842,ATENDIDO,Mesa 4,p-1");
    expect(csv).toContain(
      'PLIN,30.00,"Lucía ""Lucy"" Fernández, S.A.",,POR ATENDER,,p-2'
    );
  });
});
