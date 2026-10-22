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

  async function handleDemoAccess(role: MemberRole) {
    setLoading(true);
    document.cookie = `pagopulse_demo_role=${role}; path=/; max-age=86400; SameSite=Lax`;
    router.push("/live");
    router.refresh();
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const role: MemberRole = normalizedEmail.includes("caja")
      ? "CASHIER"
      : "OWNER";
    document.cookie = `pagopulse_demo_role=${role}; path=/; max-age=86400; SameSite=Lax`;
    router.push("/live");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-4 py-12">
      <div className="surface-card w-full max-w-md space-y-6 rounded-2xl p-8">
        <div className="space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-emerald-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="pt-1 text-2xl font-extrabold tracking-[-0.025em] text-white">
            Acceso a Terminal PagoPulse
          </h1>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            Ingresa con tu cuenta de comercio o selecciona un perfil de
            demostración para evaluar los permisos de Dueño vs. Cajero.
          </p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-zinc-300"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="caja1@bodegadonpepe.pe"
              className="surface-inset mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-zinc-300"
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
              className="surface-inset mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-tactile flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>{loading ? "Abriendo terminal..." : "Iniciar Sesión"}</span>
          </button>
        </form>

        <div className="border-t border-white/[0.06] pt-5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Cambio rápido de perfil (Modo Piloto)
          </span>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoAccess("CASHIER")}
              className="btn-tactile flex flex-col items-start gap-1 rounded-xl bg-white/[0.03] p-3.5 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] hover:bg-white/[0.07]"
            >
              <UserCheck className="h-4 w-4 text-sky-300" />
              <span className="mt-1 text-xs font-bold text-white">
                Perfil Cajero
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Solo lectura y atención de cobros
              </span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoAccess("OWNER")}
              className="btn-tactile flex flex-col items-start gap-1 rounded-xl bg-white/[0.03] p-3.5 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] hover:bg-white/[0.07]"
            >
              <Store className="h-4 w-4 text-amber-300" />
              <span className="mt-1 text-xs font-bold text-white">
                Perfil Dueño
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Control total + emparejamiento QR
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
