"use client";

import { createContext, useContext } from "react";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// "Enviar correo" llega al menú por contexto, NO por la factoría de columnas
// (`getColumns`): su callback lo da un hook de la vista
// (`usePurchaseOrderEmailConfirmation`), y si viajara como argumento de
// `getColumns`, cualquier identidad nueva recrearía las columnas y TanStack
// remontaría TODAS las celdas (se cierra el menú abierto, se pierde el foco).
// Con contexto las columnas no dependen de él y solo re-renderiza el menú que
// lo consume. Mismo patrón que `InvoiceRowActionsProvider`.

export interface PurchaseOrderRowActionsContextValue {
  /** Prepara el correo de la orden y, al terminar, la vista pide confirmación. */
  onSendEmail: (orderId: number) => void;
}

const PurchaseOrderRowActionsContext = createContext<PurchaseOrderRowActionsContextValue | null>(
  null,
);

export const PurchaseOrderRowActionsProvider = PurchaseOrderRowActionsContext.Provider;

export function usePurchaseOrderRowActionsContext(): PurchaseOrderRowActionsContextValue {
  const value = useContext(PurchaseOrderRowActionsContext);
  if (!value) {
    throw new Error(
      "Las acciones de fila de órdenes de compra deben renderizarse dentro de un PurchaseOrderRowActionsProvider (ver PurchaseOrderView).",
    );
  }
  return value;
}
