"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import {
  RfidMatchFormSchema,
  createEmptyRfidMatchForm,
  type RfidMatchFormValues,
} from "../schemas/rfid-match.schema";
import { useCreateRfidMatch } from "./useCreateRfidMatch";

/**
 * Estado del formulario de alta. Sigue la forma de `useStockTransferForm`
 * —TanStack Form + `safeParse` en el envío, errores indexados por ruta— pero
 * sin la parte de reparto de errores del backend: aquí no hay servidor que
 * rechace nada, el schema es la única validación (ver
 * `schemas/rfid-match.schema.ts`).
 */
export function useRfidMatchForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createRfidMatch = useCreateRfidMatch();

  const defaultValues: RfidMatchFormValues = createEmptyRfidMatchForm();

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const parsed = RfidMatchFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) nextErrors[key] = issue.message;
        });
        setErrors(nextErrors);
        return;
      }

      setErrors({});
      createRfidMatch(parsed.data);
      form.reset(createEmptyRfidMatchForm());
      onSuccess?.();
    },
  });

  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  const clearError = (path: string) => {
    setErrors((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  const handleReset = () => {
    form.reset(createEmptyRfidMatchForm());
    setErrors({});
  };

  return { form, getError, clearError, handleFormSubmit, handleReset };
}
