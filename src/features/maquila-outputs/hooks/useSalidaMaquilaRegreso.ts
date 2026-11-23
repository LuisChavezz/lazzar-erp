"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getReceiptDetail } from "@/src/features/receipts/services/actions";
import type { SalidaMaquila } from "../interfaces/salida-maquila.interface";
import {
  recepcionesVivasIds,
  regresoPorRenglon,
  type RecepcionDeRegreso,
} from "../utils/salidaMaquilaRegreso";

export type { RegresoRenglon } from "../utils/salidaMaquilaRegreso";

/**
 * Cuánto regresó de CADA renglón de la SM. Lo manda el backend por renglón
 * (`cantidad_recibida`, nucleo-erp #1270). Las recepciones de la SM se leen
 * para el nombre de la prenda y, si el backend aún no manda la cifra, para
 * calcularla (`regresoPorRenglon`). Solo las no canceladas (EC-925): una
 * cancelada devolvió lo recibido a pendiente.
 */
export const useSalidaMaquilaRegreso = (salida: SalidaMaquila | undefined) => {
  const ids = recepcionesVivasIds(salida);
  const { data, isLoading } = useGuardedQuery(
    {
      queryKey: ["receipts", "salida-maquila-regreso", salida?.id, ids],
      queryFn: async () => {
        const recepciones = await Promise.all(ids.map((id) => getReceiptDetail(id)));
        return regresoPorRenglon(salida?.detalles ?? [], recepciones as RecepcionDeRegreso[]);
      },
      enabled: !!salida && ids.length > 0,
    },
    { toastId: "salida-maquila-regreso-refetch-error" },
  );
  // Con la cifra del backend la tabla no espera a las recepciones (solo el nombre).
  const delBackend =
    salida && salida.detalles.length > 0 && salida.detalles.every((d) => d.cantidad_recibida !== undefined)
      ? Object.fromEntries(
          salida.detalles.map((d) => [d.id, { recibidas: Number(d.cantidad_recibida) || 0, nombre: null }]),
        )
      : null;
  return { porRenglon: data ?? delBackend, isLoading: ids.length > 0 && isLoading };
};
