"use client";

import { useEffect } from "react";
import { LAST_RESORT_ERROR_CLASSES as classes } from "@/src/styles/lastResortErrorClasses";

/**
 * Error de una página de (Main) (EC-852). Vive en `(Main)/` y no en la raíz
 * porque un `error.tsx` envuelve las páginas y layouts ANIDADOS de su
 * segmento, no el `layout.tsx` del mismo nivel: aquí queda dentro de
 * `(Main)/layout.tsx`, así que el sidebar, el header y los providers (sesión,
 * tema, QueryClient) siguen montados y solo el contenido muestra el aviso.
 *
 * Lo que truena en el propio `(Main)/layout.tsx` o más arriba (el `Provider`
 * raíz) sigue llegando a `global-error.tsx`, la pantalla de último recurso.
 * Usa sus mismas piezas visuales y sus mismas dos acciones; aquí "Reintentar"
 * (`retry`) vuelve a pedir y renderizar solo este segmento.
 */
export default function MainError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex justify-center py-16">
      <div className={classes.card}>
        <h1 className={classes.title}>Algo salió mal</h1>
        <p className={classes.message}>
          Ocurrió un error inesperado y no se pudo mostrar esta página. Reinténtalo o recárgala; si
          vuelve a pasar, avisa a soporte.
        </p>
        <div className={classes.actions}>
          <button type="button" onClick={() => retry()} className={classes.primaryButton}>
            Reintentar
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={classes.secondaryButton}
          >
            Recargar la página
          </button>
        </div>
      </div>
    </div>
  );
}
