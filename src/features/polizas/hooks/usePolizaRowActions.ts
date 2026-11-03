"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Poliza } from "../interfaces/poliza.interface";
import { contabilizarPolizaMutationKey } from "./useContabilizarPoliza";
import { cancelarPolizaMutationKey } from "./useCancelarPoliza";
import { deletePolizaMutationKey } from "./useDeletePoliza";

export interface PolizaRowActionsContextValue {
  onViewDetail: (poliza: Poliza) => void;
  onContabilizar: (poliza: Poliza) => void;
  onCancel: (poliza: Poliza) => void;
  onDelete: (poliza: Poliza) => void;
  /** Ids con alguna acción de fila en vuelo (`usePendingPolizaIds`, calculado en la lista). */
  busyIds: number[];
  /**
   * ¿El usuario puede escribir en Finanzas? (`FINANCE_WRITE_PERMISSION`). Sin el
   * permiso, "Contabilizar", "Cancelar póliza" y "Eliminar borrador" se muestran
   * deshabilitados con su motivo.
   */
  canWrite: boolean;
}

const { Provider, useRowActionsContext } = createRowActionsContext<PolizaRowActionsContextValue>(
  "PolizaFolioCell",
  "PolizaList",
);

/** Callbacks y "en vuelo" del menú de fila (`PolizaFolioCell`); ver `createRowActionsContext`. */
export const PolizaRowActionsProvider = Provider;
export const usePolizaRowActionsContext = useRowActionsContext;

/**
 * Ids de póliza con una contabilización, cancelación o borrado en curso. Una
 * sola suscripción, en `PolizaList`: una fila en vuelo no ofrece otra acción.
 */
export const usePendingPolizaIds = () =>
  usePendingRecordIds(
    contabilizarPolizaMutationKey,
    cancelarPolizaMutationKey,
    deletePolizaMutationKey,
  );
