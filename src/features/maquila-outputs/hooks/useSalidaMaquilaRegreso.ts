"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getReceiptDetail } from "@/src/features/receipts/services/actions";
import type { SalidaMaquila } from "../interfaces/salida-maquila.interface";

interface RenglonRecepcion {
  salida_maquila_detalle?: number | null;
  producto_variante_sku?: string | null;
  producto_nombre?: string | null;
  cantidad_recibida?: string | number;
}

export interface RegresoRenglon {
  /** Piezas que ya regresaron de este renglón de la SM. */
  recibidas: number;
  /** Nombre de la prenda, si la recepción lo trae. */
  nombre: string | null;
}

/**
 * Cuánto regresó de CADA renglón de la SM. Lo manda el backend por renglón
 * (`cantidad_recibida`, nucleo-erp #1270). Las recepciones de la SM se leen
 * para el nombre de la prenda y, si el backend aún no manda la cifra, para
 * calcularla: por `salida_maquila_detalle` cuando viene, y si no, por SKU
 * (= `descripcion` del renglón de la SM).
 */
export const useSalidaMaquilaRegreso = (salida: SalidaMaquila | undefined) => {
  const ids = (salida?.recepciones ?? []).map((r) => r.id).sort((a, b) => a - b);
  const { data, isLoading } = useGuardedQuery(
    {
      queryKey: ["receipts", "salida-maquila-regreso", salida?.id, ids],
      queryFn: async () => {
        const recepciones = await Promise.all(ids.map((id) => getReceiptDetail(id)));
        const renglones = recepciones.flatMap(
          (r) => ((r as unknown as { detalles?: RenglonRecepcion[] }).detalles ?? []),
        );
        const porRenglon: Record<number, RegresoRenglon> = {};
        for (const d of salida?.detalles ?? []) {
          const mios = renglones.filter((r) =>
            r.salida_maquila_detalle != null
              ? r.salida_maquila_detalle === d.id
              : !!r.producto_variante_sku && r.producto_variante_sku === d.descripcion,
          );
          porRenglon[d.id] = {
            recibidas:
              d.cantidad_recibida !== undefined
                ? Number(d.cantidad_recibida) || 0
                : mios.reduce((acc, r) => acc + (Number(r.cantidad_recibida) || 0), 0),
            nombre: mios.find((r) => r.producto_nombre)?.producto_nombre ?? null,
          };
        }
        return porRenglon;
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
