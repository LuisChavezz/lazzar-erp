"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// "Enviar correo" llega al menú por contexto, NO por la factoría de columnas
// (ver `createRowActionsContext`): su callback lo da un hook de la vista
// (`usePurchaseOrderEmailConfirmation`).

export interface PurchaseOrderRowActionsContextValue {
  /** Prepara el correo de la orden y, al terminar, la vista pide confirmación. */
  onSendEmail: (orderId: number) => void;
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<PurchaseOrderRowActionsContextValue>(
    "FolioCell (órdenes de compra)",
    "PurchaseOrderView",
  );

/** Callbacks del menú de fila (`PurchaseOrderColumns`); ver `createRowActionsContext`. */
export const PurchaseOrderRowActionsProvider = Provider;
export const usePurchaseOrderRowActionsContext = useRowActionsContext;
