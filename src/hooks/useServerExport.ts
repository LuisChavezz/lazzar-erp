"use client";

import { useCallback, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";

/**
 * Exportación (CSV, PDF…) de una tabla en MODO SERVIDOR: la tabla solo tiene
 * la página visible, así que las filas se piden al backend al exportar
 * (`getRows`, normalmente `fetchAllRows` de `useServerTable`).
 *
 * Devuelve `runExport(build)`: pide las filas, se las pasa a `build` (que arma
 * y descarga el archivo) y muestra un toast de progreso mientras tanto. Si el
 * pedido o `build` fallan, el toast pasa a error con el mensaje del backend y
 * no se genera ningún archivo.
 *
 * `exportId` identifica ESTA exportación (lista + formato, p. ej.
 * `"purchase-orders-csv"`) y es también el id de su toast:
 * - Mientras una exportación corre, otro disparo de la MISMA se ignora (un
 *   doble clic no descarga dos veces).
 * - Exportaciones distintas (el CSV y el PDF de la misma lista) corren cada
 *   una con su toast: que una termine no quita el aviso de la otra.
 *
 * `getRows` se lee al exportar (por ref), no al montar: siempre los criterios
 * vigentes.
 */
export const useServerExport = <T>(getRows: () => Promise<T[]>, exportId: string) => {
  const getRowsRef = useRef(getRows);
  const isRunningRef = useRef(false);

  useEffect(() => {
    getRowsRef.current = getRows;
  }, [getRows]);

  return useCallback(
    async (build: (rows: T[]) => void | Promise<void>) => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      toast.loading("Preparando la exportación…", { id: exportId });
      try {
        await build(await getRowsRef.current());
        toast.dismiss(exportId);
      } catch (error) {
        toast.error(extractErrorMessage(error, "No se pudo exportar. Intenta de nuevo."), {
          id: exportId,
        });
      } finally {
        isRunningRef.current = false;
      }
    },
    [exportId],
  );
};
