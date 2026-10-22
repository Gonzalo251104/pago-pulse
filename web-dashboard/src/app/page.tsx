import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Volume2, KeyRound, Check } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Minimal Editorial Top Bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.07] text-emerald-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold tracking-tight">PagoPulse</span>
          <span className="font-mono-tabular rounded bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
            POS v0.1
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-white"
          >
            Cambiar rol / Ingresar
          </Link>
          <Link
            href="/live"
            className="btn-tactile inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"
          >
            <span>Abrir Terminal</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Asymmetric Split Editorial Hero (Taste-Skill & Impeccable) */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-12 lg:gap-10 lg:pt-16">
        {/* Left 7 Columns: Editorial Typography & Action */}
        <div className="space-y-7 lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1 text-xs text-[var(--text-secondary)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Verificación antifraude para comercios en Perú</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-[-0.035em] leading-[1.05] text-white sm:text-5xl lg:text-[3.4rem]">
            Cero capturas falsas en tu mostrador de caja.
          </h1>

          <p className="max-w-[56ch] text-base leading-relaxed text-[var(--text-secondary)]">
            El agente Android en el celular del dueño detecta cada notificación
            real de <strong className="font-semibold text-white">Yape</strong> y{" "}
            <strong className="font-semibold text-white">Plin</strong>, la firma
            con <code className="font-mono-tabular text-xs text-zinc-300">HMAC-SHA256</code>{" "}
            y la anuncia por altavoz en el monitor del cajero en menos de un
            segundo—sin compartir claves bancarias.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/live"
              className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-zinc-950 shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_12px_28px_-6px_rgba(16,185,129,0.35)] hover:bg-emerald-300"
            >
              <span>Entrar al Monitor de Caja</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>

            <Link
              href="/devices"
              className="btn-tactile inline-flex items-center gap-2 rounded-xl bg-white/[0.05] px-4 py-3 text-sm font-medium text-zinc-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.09)] hover:bg-white/[0.09]"
            >
              <span>Vincular celular por QR</span>
            </Link>
          </div>

          {/* Calibrated Technical Specs Strip */}
          <dl className="grid grid-cols-3 gap-6 border-t border-white/[0.07] pt-7">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Latencia a Caja
              </dt>
              <dd className="font-mono-tabular mt-1 text-xl font-bold text-white">
                &lt; 450 ms
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Integridad Webhook
              </dt>
              <dd className="font-mono-tabular mt-1 text-xl font-bold text-white">
                HMAC-256
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                Cola Offline
              </dt>
              <dd className="font-mono-tabular mt-1 text-xl font-bold text-white">
                Room SQLite
              </dd>
            </div>
          </dl>
        </div>

        {/* Right 5 Columns: Live POS Verification Specimen */}
        <div className="lg:col-span-5">
          <div className="surface-card relative overflow-hidden rounded-2xl p-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-mono-tabular text-xs font-medium text-zinc-300">
                  TERMINAL DE CAJA • EN VIVO
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                <Volume2 className="h-3 w-3" />
                Voz activa
              </span>
            </div>

            {/* Specimen Ticket */}
            <div className="mt-5 space-y-4">
              <div className="surface-inset rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#8a3ffc]/20 px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#d4bbff]">
                        YAPE
                      </span>
                      <span className="font-mono-tabular inline-flex items-center gap-1 rounded bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-300">
                        <KeyRound className="h-3 w-3" />
                        CÓD 842
                      </span>
                    </div>
                    <p className="mt-2 text-base font-bold text-white">
                      Carlos Mendoza
                    </p>
                    <p className="font-mono-tabular mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                      22:30:04 • Xiaomi Redmi Note 13
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      S/
                    </span>{" "}
                    <span className="font-mono-tabular text-2xl font-extrabold tracking-tight text-emerald-400">
                      45.50
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3 text-xs">
                  <span className="text-[var(--text-secondary)]">
                    &ldquo;Yape recibido de Carlos Mendoza por 45 soles con 50
                    céntimos&rdquo;
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    Verificado
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] text-[var(--text-tertiary)]">
                <span>Idempotencia SHA-256 activa</span>
                <span className="font-mono-tabular">23505-safe</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
