"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Contract } from "../interfaces/contract.interface";
import { deactivateContractMutationKey } from "./useDeleteContract";

export interface ContractRowActionsContextValue {
  onEdit: (contract: Contract) => void;
  onDeactivate: (contract: Contract) => void;
  /** Ids con una baja en vuelo (`usePendingContractIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<ContractRowActionsContextValue>(
  "ContractNameCell",
  "ContractList"
);

/** Callbacks y "en vuelo" del menú de fila (`ContractNameCell`); ver `createRowActionsContext`. */
export const ContractRowActionsProvider = Provider;
export const useContractRowActionsContext = useRowActionsContext;

/** Ids de contrato con una desactivación en curso. Una sola suscripción, en `ContractList`. */
export const usePendingContractIds = () => usePendingRecordIds(deactivateContractMutationKey);
