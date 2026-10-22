"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Store, UserCheck, Lock } from "lucide-react";
import type { MemberRole } from "@/lib/supabase/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDemoAccess(role: MemberRole) {
    setLoading(true);
    setErrorMessage(null);
    document.cookie = `pagopulse_demo_role=${role}; path=/; max-age=86400; SameSite=Lax`;
    router.push("/live");
    router.refresh();
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const role: MemberRole = normalizedEmail.includes("caja")
        ? "CASHIER"
        : "OWNER";
      document.cookie = `pagopulse_demo_role=${role}; path=/; max-age=86400; SameSite=Lax`;
      router.push("/live");
      router.refresh();
    } catch {
      setErrorMessage("No se pudo iniciar sesión. Verifica tus credenciales.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Ingresar a PagoPulse
          </h1>
          <p className="text-sm text-slate-400">
            Verificación instantánea de pagos Yape y Plin para tu negocio
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-slate-300"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="caja1@minegocio.pe"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-slate-300"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-500">
              Acceso rápido de demostración
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleDemoAccess("CASHIER")}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-center transition hover:border-emerald-500/50 hover:bg-slate-900"
          >
            <UserCheck className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-semibold text-white">
              Modo Cajero
            </span>
            <span className="text-[11px] text-slate-400">
              Solo lectura y atención
            </span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleDemoAccess("OWNER")}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-center transition hover:border-purple-500/50 hover:bg-slate-900"
          >
            <Store className="h-5 w-5 text-purple-400" />
            <span className="text-xs font-semibold text-white">
              Modo Dueño
            </span>
            <span className="text-[11px] text-slate-400">
              Control total + QR
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
