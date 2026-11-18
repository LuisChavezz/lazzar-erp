"use client";

import { useEffect, useLayoutEffect } from "react";
import "./globals.css";
import { LAST_RESORT_ERROR_CLASSES as classes } from "@/src/styles/lastResortErrorClasses";

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
        <main className={classes.screen}>
          <div className={classes.card}>
            <h1 className={classes.title}>
              Algo salió mal
            </h1>
            <p className={classes.message}>
              Ocurrió un error inesperado y no se pudo mostrar la página. Recárgala para
              continuar; si vuelve a pasar, avisa a soporte.
            </p>
            <div className={classes.actions}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={classes.primaryButton}
              >
                Recargar la página
              </button>
              <button
                type="button"
                onClick={() => retry()}
                className={classes.secondaryButton}
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
