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
    },
    {
      href: "/history",
      label: "Cuadre e Historial",
      icon: History,
    },
    {
      href: "/devices",
      label: "Teléfonos",
      icon: Smartphone,
    },
  ];

  function handleSwitchRole() {
    const nextRole: MemberRole = role === "OWNER" ? "CASHIER" : "OWNER";
    document.cookie = `pagopulse_demo_role=${nextRole}; path=/; max-age=86400; SameSite=Lax`;
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-canvas)]/90 shadow-[0_1px_0_0_rgba(255,255,255,0.065)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/live" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-emerald-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold tracking-tight text-white">
                PagoPulse
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">/</span>
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {organizationName}
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1 rounded-lg bg-white/[0.03] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`btn-tactile flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                    isActive
                      ? "bg-white/[0.1] text-white shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                      : "text-[var(--text-secondary)] hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      isActive ? "text-emerald-400" : "opacity-70"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSwitchRole}
            title="Haz clic para alternar entre vista de Dueño y Cajero"
            className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-white/[0.08]"
          >
            {role === "OWNER" ? (
              <Crown className="h-3.5 w-3.5 text-amber-300" />
            ) : (
              <UserCheck className="h-3.5 w-3.5 text-sky-300" />
            )}
            <span>{role === "OWNER" ? "Rol: Dueño" : "Rol: Cajero"}</span>
            <span className="hidden text-[var(--text-tertiary)] sm:inline">
              · {fullName}
            </span>
          </button>

          <Link
            href="/login"
            className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cuenta</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
