"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  Wallet,
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
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            Historial y Cuadre de Caja Diario
          </h1>
          <p className="text-xs text-slate-400">
            Filtra pagos por fecha, billetera o cliente y descarga el reporte
            CSV para contabilidad.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredPayments.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span>Exportar Cuadre CSV ({filteredPayments.length})</span>
        </button>
      </div>

      {/* Daily Totals by Wallet */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Total General Recaudado</span>
            <Wallet className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-white">
            S/ {summary.totalAmount.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.totalCount} pagos ({summary.claimedCount} atendidos,{" "}
            {summary.unclaimedCount} sin reclamar)
          </p>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-950/15 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-300">
            <span>Subtotal Yape</span>
            <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px]">
              YAPE
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-purple-300">
            S/ {summary.yapeTotal.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {summary.yapeCount} operaciones por Yape
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/15 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
            <span>Subtotal Plin</span>
            <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px]">
              PLIN
            </span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-cyan-300">
            S/ {summary.plinTotal.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {summary.plinCount} operaciones por Plin
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cliente, código o mesa..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            type="date"
            aria-label="Fecha desde"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            type="date"
            aria-label="Fecha hasta"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(["ALL", "YAPE", "PLIN"] as const).map((wallet) => (
            <button
              key={wallet}
              type="button"
              onClick={() => setWalletFilter(wallet)}
              className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                walletFilter === wallet
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                  : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
              }`}
            >
              {wallet === "ALL" ? "Todas" : wallet}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Fecha / Hora</th>
                <th className="px-4 py-3">Billetera</th>
                <th className="px-4 py-3">Remitente</th>
                <th className="px-4 py-3">Cód. Seg.</th>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Cargando historial de transacciones...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No se encontraron pagos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="transition hover:bg-slate-900/90"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                      {new Date(payment.notified_at).toLocaleString("es-PE", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          payment.wallet === "YAPE"
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-cyan-500/20 text-cyan-300"
                        }`}
                      >
                        {payment.wallet}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      {payment.sender_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-amber-300">
                      {payment.security_code ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {payment.order_reference ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {payment.status === "CLAIMED" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Atendido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <Clock className="h-3.5 w-3.5" />
                          Por atender
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-emerald-400">
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
