"use client";

import { createContext, useContext } from "react";
import type { SupplierReturn } from "../interfaces/supplier-return.interface";

// Los callbacks llegan a la celda del folio por contexto, NO por la factoría de
// columnas: las columnas son estáticas y los diálogos viven en la lista
// (`SupplierReturnList`), así que siguen abiertos aunque la celda se desmonte
// al refrescar, paginar, ordenar o filtrar. Mismo patrón que
// `usePurchaseOrderReceiptRowActions`.

export interface SupplierReturnRowActionsContextValue {
  onViewDetail: (dev: SupplierReturn) => void;
  onCancel: (dev: SupplierReturn) => void;
  /** `C-WMS-RECEPCIONES`: sin él no se ofrece "Cancelar". */
  canWrite: boolean;
}

const SupplierReturnRowActionsContext = createContext<SupplierReturnRowActionsContextValue | null>(null);

export const SupplierReturnRowActionsProvider = SupplierReturnRowActionsContext.Provider;

export function useSupplierReturnRowActionsContext(): SupplierReturnRowActionsContextValue {
  const value = useContext(SupplierReturnRowActionsContext);
  if (!value) {
    throw new Error(
      "La celda de folio de devoluciones debe renderizarse dentro de un SupplierReturnRowActionsProvider (ver SupplierReturnList).",
    );
  }
  return value;
}
