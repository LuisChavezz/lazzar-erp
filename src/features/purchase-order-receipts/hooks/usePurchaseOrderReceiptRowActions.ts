"use client";

import { createContext, useContext } from "react";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";

// El callback de "ver detalle" llega a la celda del folio por contexto, NO por
// la factoría de columnas: las columnas son estáticas y no cambian de
// identidad, y el diálogo vive en la lista (`PurchaseOrderReceiptList`), así
// que sigue abierto aunque la celda se desmonte al refrescar, paginar, ordenar
// o filtrar. Mismo patrón que `useOpportunityRowActions`.

export interface PurchaseOrderReceiptRowActionsContextValue {
  onViewDetail: (receipt: PurchaseOrderReceipt) => void;
}

const PurchaseOrderReceiptRowActionsContext =
  createContext<PurchaseOrderReceiptRowActionsContextValue | null>(null);

export const PurchaseOrderReceiptRowActionsProvider =
  PurchaseOrderReceiptRowActionsContext.Provider;

export function usePurchaseOrderReceiptRowActionsContext(): PurchaseOrderReceiptRowActionsContextValue {
  const value = useContext(PurchaseOrderReceiptRowActionsContext);
  if (!value) {
    throw new Error(
      "La celda de folio de recepciones debe renderizarse dentro de un PurchaseOrderReceiptRowActionsProvider (ver PurchaseOrderReceiptList)."
    );
  }
  return value;
}
