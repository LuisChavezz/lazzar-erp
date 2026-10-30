"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import type { Pago } from "../interfaces/payment.interface";

export interface PaymentRowActionsContextValue {
  onViewDetail: (pago: Pago) => void;
  onCancel: (pago: Pago) => void;
  /** Id del pago con una cancelación en vuelo, si hay. */
  cancellingId: number | null;
}

const { Provider, useRowActionsContext } = createRowActionsContext<PaymentRowActionsContextValue>(
  "PaymentIdCell",
  "PaymentList",
);

/** Callbacks y "en vuelo" del menú de fila (`PaymentIdCell`); ver `createRowActionsContext`. */
export const PaymentRowActionsProvider = Provider;
export const usePaymentRowActionsContext = useRowActionsContext;
