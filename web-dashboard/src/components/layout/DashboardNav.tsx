"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Radio,
  History,
  Smartphone,
  ShieldCheck,
  LogOut,
  UserCheck,
  Crown,
} from "lucide-react";
import type { MemberRole } from "@/lib/supabase/types";

interface DashboardNavProps {
  organizationName: string;
  fullName: string;
  role: MemberRole;
}

export function DashboardNav({
  organizationName,
  fullName,
  role,
}: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      href: "/live",
      label: "Caja en Vivo",
      icon: Radio,
      roles: ["OWNER", "CASHIER"] as MemberRole[],
    },
    {
      href: "/history",
      label: "Historial y Cuadre",
      icon: History,
      roles: ["OWNER", "CASHIER"] as MemberRole[],
    },
    {
      href: "/devices",
      label: "Teléfonos",
      icon: Smartphone,
      roles: ["OWNER", "CASHIER"] as MemberRole[],
    },
  ];

  function handleSwitchRole() {
    const nextRole: MemberRole = role === "OWNER" ? "CASHIER" : "OWNER";
    document.cookie = `pagopulse_demo_role=${nextRole}; path=/; max-age=86400; SameSite=Lax`;
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/live" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">
                  PagoPulse
                </span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                  {organizationName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Verificador antifraude Yape / Plin
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSwitchRole}
            title="Haz clic para alternar entre vista de Dueño y Cajero"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
              role === "OWNER"
                ? "bg-purple-500/15 text-purple-300 ring-purple-500/30 hover:bg-purple-500/25"
                : "bg-sky-500/15 text-sky-300 ring-sky-500/30 hover:bg-sky-500/25"
            }`}
          >
            {role === "OWNER" ? (
              <Crown className="h-3.5 w-3.5" />
            ) : (
              <UserCheck className="h-3.5 w-3.5" />
            )}
            <span>{role === "OWNER" ? "Rol: Dueño" : "Rol: Cajero"}</span>
            <span className="text-slate-400">({fullName})</span>
          </button>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-slate-700 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cambiar cuenta</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
