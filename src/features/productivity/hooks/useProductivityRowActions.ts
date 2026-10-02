"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import type { Productivity } from "../interfaces/productivity.interface";
import { deleteProductivityMutationKey } from "./useDeleteProductivity";
import { changeProductivityEstadoMutationKey } from "./useChangeProductivityEstado";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Callbacks y "en vuelo" llegan al menú por contexto, NO por la factoría de
// columnas (cambiarlos remontaría todas las celdas). El padre guarda solo ids:
// confirmar o reabrir cambia `estado` —un filtro— y la fila puede salir de la
// vista a mitad de la interacción. Mismo patrón que `useAbsenceRowActions`.

export interface ProductivityRowActionsContextValue {
  onView: (record: Productivity) => void;
  onEdit: (record: Productivity) => void;
  onConfirm: (record: Productivity) => void;
  onReopen: (record: Productivity) => void;
  onDelete: (record: Productivity) => void;
  /** Ids con una acción en vuelo (`usePendingProductivityIds`, calculado en la lista). */
  busyIds: number[];
}

const ProductivityRowActionsContext = createContext<ProductivityRowActionsContextValue | null>(
  null
);

export const ProductivityRowActionsProvider = ProductivityRowActionsContext.Provider;

export function useProductivityRowActionsContext(): ProductivityRowActionsContextValue {
  const value = useContext(ProductivityRowActionsContext);
  if (!value) {
    throw new Error(
      "ProductivityRowActionsMenu debe renderizarse dentro de un ProductivityRowActionsProvider (ver ProductivityList)."
    );
  }
  return value;
}

const ROW_MUTATION_KEYS = new Set<unknown>([
  deleteProductivityMutationKey[0],
  changeProductivityEstadoMutationKey[0],
]);

/**
 * Ids con una acción EN CURSO (eliminar, confirmar, devolver a borrador), de
 * la `MutationCache`. UNA suscripción, llamada una vez en `ProductivityList`;
 * llega a cada menú por el contexto.
 */
export function usePendingProductivityIds(): number[] {
  return useMutationState({
    filters: {
      status: "pending",
      predicate: (mutation) => ROW_MUTATION_KEYS.has(mutation.options.mutationKey?.[0]),
    },
    select: selectMutationRecordId,
  });
}
