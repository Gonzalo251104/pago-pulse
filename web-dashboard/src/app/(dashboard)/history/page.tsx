"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type {
  PaymentTransactionRow,
  WalletProvider,
} from "@/lib/supabase/types";
import {
  calculateReconciliationSummary,
  generatePaymentsCsv,
} from "@/lib/reconciliation/csv-exporter";

export default function HistoryReconciliationPage() {
  const [payments, setPayments] = useState<PaymentTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [walletFilter, setWalletFilter] = useState<"ALL" | WalletProvider>(
    "ALL"
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function loadPayments() {
      try {
        const res = await fetch("/api/v1/payments", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as {
            payments: PaymentTransactionRow[];
          };
          setPayments(data.payments);
        }
      } finally {
        setLoading(false);
      }
    }
    loadPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (walletFilter !== "ALL" && p.wallet !== walletFilter) {
        return false;
      }

      if (startDate) {
        const startMs = new Date(`${startDate}T00:00:00`).getTime();
        if (new Date(p.notified_at).getTime() < startMs) return false;
      }

      if (endDate) {
        const endMs = new Date(`${endDate}T23:59:59.999`).getTime();
        if (new Date(p.notified_at).getTime() > endMs) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesSender = p.sender_name.toLowerCase().includes(q);
        const matchesCode = (p.security_code ?? "").toLowerCase().includes(q);
        const matchesRef = (p.order_reference ?? "").toLowerCase().includes(q);
        if (!matchesSender && !matchesCode && !matchesRef) return false;
      }

      return true;
    });
  }, [payments, walletFilter, startDate, endDate, searchQuery]);

  const summary = useMemo(
    () => calculateReconciliationSummary(filteredPayments),
    [filteredPayments]
  );

  function handleExportCsv() {
    const csvContent = generatePaymentsCsv(filteredPayments);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateSuffix = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute("download", `cuadre-caja-pagopulse-${dateSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Editorial Header + Action */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/[0.065] pb-5 sm:flex-row sm:items-end">
        <div>
          <span className="font-mono-tabular text-[11px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
            Conciliación Contable
          </span>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.025em] text-white">
            Cuadre de Caja e Historial Diario
          </h1>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredPayments.length === 0}
          className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-emerald-300 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span>
            Exportar Cuadre CSV (
            <span className="font-mono-tabular">{filteredPayments.length}</span>)
          </span>
        </button>
      </div>

      {/* Unified Horizontal Financial Ledger Ribbon (Instead of 3 generic AI cards) */}
      <div className="surface-card grid grid-cols-1 divide-y divide-white/[0.06] rounded-2xl sm:grid-cols-12 sm:divide-x sm:divide-y-0">
        <div className="p-5 sm:col-span-5">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Total Recaudado en Rango Seleccionado
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-[var(--text-secondary)]">
              S/
            </span>
            <span className="font-mono-tabular text-3xl font-extrabold tracking-tight text-white">
              {summary.totalAmount.toFixed(2)}
            </span>
          </div>
          <p className="font-mono-tabular mt-1.5 text-xs text-[var(--text-tertiary)]">
            {summary.totalCount} operaciones · {summary.claimedCount} atendidos ·{" "}
            {summary.unclaimedCount} pendientes
          </p>
        </div>

        <div className="p-5 sm:col-span-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[#9d4edd]" />
            <span>Subtotal Yape</span>
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-bold text-[#e0aaff]">
            S/ {summary.yapeTotal.toFixed(2)}
          </p>
          <p className="font-mono-tabular mt-1 text-xs text-[var(--text-tertiary)]">
            {summary.yapeCount} cobros Yape
          </p>
        </div>

        <div className="p-5 sm:col-span-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>Subtotal Plin</span>
          </div>
          <p className="font-mono-tabular mt-2 text-2xl font-bold text-cyan-300">
            S/ {summary.plinTotal.toFixed(2)}
          </p>
          <p className="font-mono-tabular mt-1 text-xs text-[var(--text-tertiary)]">
            {summary.plinCount} cobros Plin
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="relative sm:col-span-5">
          <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por cliente, código de 3 dígitos o mesa..."
            className="surface-inset w-full rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
          />
        </div>

        <div className="flex items-center gap-2 sm:col-span-2">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
          <input
            type="date"
            aria-label="Fecha desde"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="surface-inset w-full rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 sm:col-span-2">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
          <input
            type="date"
            aria-label="Fecha hasta"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="surface-inset w-full rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:col-span-3">
          {(["ALL", "YAPE", "PLIN"] as const).map((wallet) => (
            <button
              key={wallet}
              type="button"
              onClick={() => setWalletFilter(wallet)}
              className={`btn-tactile flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                walletFilter === wallet
                  ? "bg-white text-zinc-950"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              {wallet === "ALL" ? "Todas" : wallet}
            </button>
          ))}
        </div>
      </div>

      {/* Tabular Financial Ledger */}
      <div className="surface-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              <tr>
                <th className="px-4 py-3.5">Fecha y Hora</th>
                <th className="px-4 py-3.5">Billetera</th>
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5">Cód. Seg.</th>
                <th className="px-4 py-3.5">Referencia</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-right">Importe (PEN)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.045]">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-[var(--text-secondary)]"
                  >
                    Cargando libro de transacciones...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-[var(--text-secondary)]"
                  >
                    No se encontraron pagos con los criterios actuales.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="transition-colors hover:bg-white/[0.025]"
                  >
                    <td className="font-mono-tabular whitespace-nowrap px-4 py-3.5 text-[var(--text-secondary)]">
                      {new Date(payment.notified_at).toLocaleString("es-PE", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[10px] font-extrabold tracking-wider ${
                          payment.wallet === "YAPE"
                            ? "bg-[#9d4edd]/20 text-[#e0aaff]"
                            : "bg-cyan-400/15 text-cyan-300"
                        }`}
                      >
                        {payment.wallet}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-white">
                      {payment.sender_name}
                    </td>
                    <td className="font-mono-tabular px-4 py-3.5 font-semibold text-amber-300">
                      {payment.security_code ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300">
                      {payment.order_reference ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {payment.status === "CLAIMED" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Atendido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <Clock className="h-3.5 w-3.5" />
                          Por atender
                        </span>
                      )}
                    </td>
                    <td className="font-mono-tabular whitespace-nowrap px-4 py-3.5 text-right text-sm font-bold text-white">
                      S/ {Number(payment.amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
