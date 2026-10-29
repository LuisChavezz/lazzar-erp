"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import type { Contract } from "../interfaces/contract.interface";
import { deactivateContractMutationKey } from "./useDeleteContract";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Los callbacks llegan al menú (`ContractNameCell`) por contexto, NO por la
// factoría de columnas: si el "en vuelo" viajara dentro de `getColumns(...)`,
// cada inicio y fin de una acción crearía funciones `cell` nuevas y React
// remontaría TODAS las celdas. Mismo patrón que `useEmployeeRowActions`.

export interface ContractRowActionsContextValue {
  onEdit: (contract: Contract) => void;
  onDeactivate: (contract: Contract) => void;
  /** Ids con una baja en vuelo (`usePendingContractIds`, calculado en la lista). */
  busyIds: number[];
}

const ContractRowActionsContext = createContext<ContractRowActionsContextValue | null>(null);

export const ContractRowActionsProvider = ContractRowActionsContext.Provider;

/** Para `ContractNameCell`: exige estar bajo un `ContractRowActionsProvider`. */
export function useContractRowActionsContext(): ContractRowActionsContextValue {
  const value = useContext(ContractRowActionsContext);
  if (!value) {
    throw new Error(
      "ContractNameCell debe renderizarse dentro de un ContractRowActionsProvider (ver ContractList)."
    );
  }
  return value;
}

/**
 * Ids de contrato con una desactivación EN CURSO, leídos de la `MutationCache`
 * y no del `useMutation`, que solo recuerda su ÚLTIMA llamada. Una sola
 * suscripción, en `ContractList`; llega a cada menú por el contexto.
 */
export function usePendingContractIds(): number[] {
  return useMutationState({
    filters: { status: "pending", mutationKey: deactivateContractMutationKey },
    select: selectMutationRecordId,
  });
}
