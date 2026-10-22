import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PagoPulse — Verificación de Yape y Plin en Tiempo Real",
  description:
    "Sistema de verificación de pagos móviles en tiempo real y cuadre de caja para comercios en Perú.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
