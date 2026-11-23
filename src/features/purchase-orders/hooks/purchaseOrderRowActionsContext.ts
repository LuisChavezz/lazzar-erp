"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// "Enviar correo" llega al menú por contexto, NO por la factoría de columnas
// (ver `createRowActionsContext`): su callback lo da un hook de la vista
// (`usePurchaseOrderEmailConfirmation`).

export interface PurchaseOrderRowActionsContextValue {
  /** Prepara el correo de la orden y, al terminar, la vista pide confirmación. */
  onSendEmail: (orderId: number) => void;
  /**
   * Los datos de la empresa del encabezado del PDF adjunto aún se están
   * cargando (`usePdfCompany`): "Enviar correo" se deshabilita mientras tanto.
   */
  emailPendingCompany: boolean;
  /**
   * Órdenes con una confirmación EN CURSO (`usePendingRecordIds` sobre
   * `confirmPurchaseOrderMutationKey`). Una sola suscripción en la vista: el
   * `isPending` de la mutación de la celda se pierde si la celda se remonta.
   */
  confirmPendingIds: readonly number[];
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<PurchaseOrderRowActionsContextValue>(
    "FolioCell (órdenes de compra)",
    "PurchaseOrderView",
  );

/** Callbacks del menú de fila (`PurchaseOrderColumns`); ver `createRowActionsContext`. */
export const PurchaseOrderRowActionsProvider = Provider;
export const usePurchaseOrderRowActionsContext = useRowActionsContext;
