"use client";

import { approveOperationsQuote } from "../services/actions";
import { createOperationsQuoteMutation } from "./createOperationsQuoteMutation";

export const approveOperationsQuoteMutationKey = [
  "approve-operations-quote",
] as const;

export const useApproveOperationsQuote = createOperationsQuoteMutation({
  mutationKey: approveOperationsQuoteMutationKey,
  mutationFn: approveOperationsQuote,
  successMessage: "Pedido autorizado correctamente",
  errorMessage: "No se pudo autorizar el pedido",
});
