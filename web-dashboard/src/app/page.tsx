import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
          PagoPulse v0.1
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Verificación de Yape y Plin en Tiempo Real
        </h1>
        <p className="text-sm text-slate-400">
          Panel de caja contra capturas falsas. Conecta el teléfono del negocio y
          confirma cada pago en menos de 1 segundo.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/live"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Ir a Caja en Vivo
          </Link>
        </div>
      </div>
    </main>
  );
}
