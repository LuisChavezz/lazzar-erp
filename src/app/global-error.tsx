"use client";

import { useEffect, useLayoutEffect } from "react";
import "./globals.css";

/**
 * Pantalla de error de último recurso: atrapa lo que truena en el layout raíz
 * (`layout.tsx` → `Provider`, donde viven el `<Toaster>` y el QueryClient), que
 * ningún `error.tsx` de segmento puede atrapar porque está por encima de ellos.
 * Sin este archivo Next mostraba su pantalla genérica en inglés ("This page
 * couldn't load", EC-898).
 *
 * Reemplaza al layout raíz cuando se activa, así que trae su propio
 * `<html>`/`<body>` y sus estilos: importa `globals.css` y aplica el tema
 * guardado con la misma regla que el script anti-FOUC del layout (sin él,
 * `dark:` no aplicaría). Lo hace en `useLayoutEffect`, antes del primer
 * pintado, y no con un `<script>` en línea como el layout: esta pantalla casi
 * siempre se monta en el cliente tras un error de render, y React no ejecuta
 * un `<script>` que inserta él mismo. Las fuentes de `next/font` no llegan
 * aquí; el `body` cae en sus fuentes de respaldo.
 *
 * "Recargar la página" es la acción principal: descarta todo el estado en
 * memoria (caché de consultas, toasts pendientes), que es lo que puede volver a
 * tirar la app si solo se re-renderiza. "Reintentar" (`retry`) vuelve a pedir
 * y renderizar sin recargar.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem("theme-storage");
      const theme = stored ? JSON.parse(stored)?.state?.theme : null;
      const isDark =
        theme === "dark" ||
        (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", isDark);
    } catch {
      // Sin acceso a localStorage: queda el tema claro por defecto.
    }
  }, []);

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        <title>Error | ERP</title>
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-zinc-950">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Algo salió mal
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Ocurrió un error inesperado y no se pudo mostrar la página. Recárgala para
              continuar; si vuelve a pasar, avisa a soporte.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="cursor-pointer rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
              >
                Recargar la página
              </button>
              <button
                type="button"
                onClick={() => retry()}
                className="cursor-pointer rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                Reintentar
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
