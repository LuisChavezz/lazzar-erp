"use client";

import { rejectChangesOperationsQuote } from "../services/actions";
import { createOperationsQuoteMutation } from "./createOperationsQuoteMutation";

export const rejectChangesOperationsQuoteMutationKey = [
  "reject-changes-operations-quote",
] as const;

export const useRejectChangesOperationsQuote = createOperationsQuoteMutation({
  mutationKey: rejectChangesOperationsQuoteMutationKey,
  mutationFn: rejectChangesOperationsQuote,
  successMessage: "Cambios rechazados correctamente",
  errorMessage: "No se pudieron rechazar los cambios",
});
