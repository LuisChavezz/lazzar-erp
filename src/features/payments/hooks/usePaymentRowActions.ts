"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Pago } from "../interfaces/payment.interface";
import { cancelPagoMutationKey } from "./useCancelPago";

export interface PaymentRowActionsContextValue {
  onViewDetail: (pago: Pago) => void;
  onCancel: (pago: Pago) => void;
  /** Ids con una cancelación en vuelo (`usePendingPaymentIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<PaymentRowActionsContextValue>(
  "PaymentIdCell",
  "PaymentList",
);

/** Callbacks y "en vuelo" del menú de fila (`PaymentIdCell`); ver `createRowActionsContext`. */
export const PaymentRowActionsProvider = Provider;
export const usePaymentRowActionsContext = useRowActionsContext;

/** Ids de pago con una cancelación en curso. Una sola suscripción, en `PaymentList`. */
export const usePendingPaymentIds = () => usePendingRecordIds(cancelPagoMutationKey);
