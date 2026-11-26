"use client";

import { createContext, useContext } from "react";
import type { RfidReconciliationRow } from "../interfaces/rfid-reconciliation.interface";

// Los callbacks llegan a la celda del folio por contexto, NO por la factoría de
// columnas: las columnas son estáticas y los diálogos viven en la lista
// (`RfidReconciliationList`), así que siguen abiertos aunque la celda se
// desmonte al refrescar, paginar, ordenar o filtrar.

export interface RfidReconciliationRowActionsContextValue {
  onViewDetail: (row: RfidReconciliationRow) => void;
  onCancel: (row: RfidReconciliationRow) => void;
  /** `C-WMS-RECEPCIONES`: sin él no se ofrece "Cancelar". */
  canWrite: boolean;
}

const RfidReconciliationRowActionsContext = createContext<RfidReconciliationRowActionsContextValue | null>(null);

export const RfidReconciliationRowActionsProvider = RfidReconciliationRowActionsContext.Provider;

export function useRfidReconciliationRowActionsContext(): RfidReconciliationRowActionsContextValue {
  const value = useContext(RfidReconciliationRowActionsContext);
  if (!value) {
    throw new Error(
      "La celda de folio de encuadres debe renderizarse dentro de un RfidReconciliationRowActionsProvider (ver RfidReconciliationList).",
    );
  }
  return value;
}
