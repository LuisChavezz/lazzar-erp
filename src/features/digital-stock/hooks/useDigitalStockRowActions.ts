"use client";

import { createContext, useContext } from "react";
import type { StockDigitalFila } from "../interfaces/digital-stock.interface";

// "Ver detalle" llega a la celda por contexto, NO por la factoría de columnas:
// las columnas son estáticas y el diálogo vive en la lista (`DigitalStockList`),
// así que sigue abierto aunque la celda se desmonte al refrescar, paginar o
// filtrar. Mismo patrón que `useSurtidoPedidoRowActions`.

export interface DigitalStockRowActionsContextValue {
  onViewDetail: (fila: StockDigitalFila) => void;
}

const DigitalStockRowActionsContext = createContext<DigitalStockRowActionsContextValue | null>(
  null,
);

export const DigitalStockRowActionsProvider = DigitalStockRowActionsContext.Provider;

export function useDigitalStockRowActionsContext(): DigitalStockRowActionsContextValue {
  const value = useContext(DigitalStockRowActionsContext);
  if (!value) {
    throw new Error(
      "La celda del stock digital debe renderizarse dentro de un DigitalStockRowActionsProvider (ver DigitalStockList).",
    );
  }
  return value;
}
