"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Productivity } from "../interfaces/productivity.interface";
import { deleteProductivityMutationKey } from "./useDeleteProductivity";
import { changeProductivityEstadoMutationKey } from "./useChangeProductivityEstado";

/**
 * El padre guarda solo ids: confirmar o reabrir cambia `estado` —un filtro— y
 * la fila puede salir de la vista a mitad de la interacción. Mismo patrón que
 * `useAbsenceRowActions`.
 */
export interface ProductivityRowActionsContextValue {
  onView: (record: Productivity) => void;
  onEdit: (record: Productivity) => void;
  onConfirm: (record: Productivity) => void;
  onReopen: (record: Productivity) => void;
  onDelete: (record: Productivity) => void;
  /** Ids con una acción en vuelo (`usePendingProductivityIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<ProductivityRowActionsContextValue>(
    "ProductivityNameCell",
    "ProductivityList"
  );

/** Callbacks y "en vuelo" del menú de fila (`ProductivityNameCell`); ver `createRowActionsContext`. */
export const ProductivityRowActionsProvider = Provider;
export const useProductivityRowActionsContext = useRowActionsContext;

/**
 * Ids con una acción EN CURSO (eliminar, confirmar, devolver a borrador). Una
 * sola suscripción, en `ProductivityList`.
 */
export const usePendingProductivityIds = () =>
  usePendingRecordIds(deleteProductivityMutationKey, changeProductivityEstadoMutationKey);
