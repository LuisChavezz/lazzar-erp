"use client";

import { rejectOperationsQuote } from "../services/actions";
import { createOperationsQuoteMutation } from "./createOperationsQuoteMutation";

export const rejectOperationsQuoteMutationKey = [
  "reject-operations-quote",
] as const;

export const useRejectOperationsQuote = createOperationsQuoteMutation({
  mutationKey: rejectOperationsQuoteMutationKey,
  mutationFn: rejectOperationsQuote,
  successMessage: "Pedido rechazado correctamente",
  errorMessage: "No se pudo rechazar el pedido",
});
