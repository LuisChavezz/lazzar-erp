"use client";

import { createContext, useContext } from "react";
import type { SurtidoPedido } from "../interfaces/order-fulfillment.interface";

// "Ver avance por talla" llega a la celda por contexto, NO por la factoría de
// columnas: las columnas son estáticas y el diálogo vive en la lista
// (`SurtidoPedidosList`), así que sigue abierto aunque la celda se desmonte al
// refrescar, paginar o filtrar. Mismo patrón que `usePurchaseOrderReceiptRowActions`.

export interface SurtidoPedidoRowActionsContextValue {
  onViewDetail: (pedido: SurtidoPedido) => void;
}

const SurtidoPedidoRowActionsContext = createContext<SurtidoPedidoRowActionsContextValue | null>(
  null,
);

export const SurtidoPedidoRowActionsProvider = SurtidoPedidoRowActionsContext.Provider;

export function useSurtidoPedidoRowActionsContext(): SurtidoPedidoRowActionsContextValue {
  const value = useContext(SurtidoPedidoRowActionsContext);
  if (!value) {
    throw new Error(
      "La celda del avance de surtido debe renderizarse dentro de un SurtidoPedidoRowActionsProvider (ver SurtidoPedidosList).",
    );
  }
  return value;
}
