"use client";

import { acceptChangesOperationsQuote } from "../services/actions";
import { createOperationsQuoteMutation } from "./createOperationsQuoteMutation";

export const acceptChangesOperationsQuoteMutationKey = [
  "accept-changes-operations-quote",
] as const;

export const useAcceptChangesOperationsQuote = createOperationsQuoteMutation({
  mutationKey: acceptChangesOperationsQuoteMutationKey,
  mutationFn: acceptChangesOperationsQuote,
  successMessage: "Cambios aplicados correctamente",
  errorMessage: "No se pudieron aplicar los cambios de la cotización",
  notFoundMessage: "La cotización ya no tiene cambios pendientes de revisar.",
});
