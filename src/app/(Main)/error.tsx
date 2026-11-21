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
 * Usa sus mismas piezas visuales y sus mismas dos acciones en el mismo orden:
 * "Recargar la página" es la principal porque descarta el estado en memoria
 * (la caché de consultas: con `staleTime` de 15 min, un dato cacheado que
 * hace tronar la página volvería a hacerlo); "Reintentar" (`retry`) vuelve a
 * pedir y renderizar solo este segmento, con la misma caché.
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
          Ocurrió un error inesperado y no se pudo mostrar esta página. Recárgala o reinténtalo; si
          vuelve a pasar, avisa a soporte.
        </p>
        <div className={classes.actions}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={classes.primaryButton}
          >
            Recargar la página
          </button>
          <button type="button" onClick={() => retry()} className={classes.secondaryButton}>
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
