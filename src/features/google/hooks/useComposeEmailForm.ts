"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "../../../utils/getFieldError";
import {
  ComposeEmailFormSchema,
  type ComposeEmailFormValues,
} from "../schemas/googleEmail.schema";
import { useGoogleComposeEmail } from "./useGoogleComposeEmail";

// --- Tipos ---

interface UseComposeEmailFormParams {
  /** Callback invocado tras el envío exitoso del correo. */
  onSuccess: () => void;
}

type ComposeEmailField = keyof ComposeEmailFormValues;

// --- Valores iniciales vacíos ---

const EMPTY_VALUES: ComposeEmailFormValues = {
  to: "",
  subject: "",
  body: "",
};

// --- Hook ---

/**
 * Controla el estado del formulario de redacción de correo.
 *
 * Sigue el mismo patrón que los formularios existentes del proyecto:
 * - `clientErrors` para errores de validación Zod en cliente.
 * - `validateField` para validar onBlur campo a campo.
 * - `validateForm` para validar el formulario completo en submit.
 * - `getError` combina errores para un campo dado.
 * - `form` instancia de TanStack Form que gestiona el estado y el submit.
 */
export function useComposeEmailForm({ onSuccess }: UseComposeEmailFormParams) {
  const [clientErrors, setClientErrors] =
    useState<Partial<Record<ComposeEmailField, string>>>({});

  const { mutateAsync: sendEmail, isPending } = useGoogleComposeEmail();

  // --- Limpia el error de un campo al cambiar su valor ---
  const clearFieldErrors = (field: ComposeEmailField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // --- Valida un campo individual (onBlur) ---
  const validateField = (field: ComposeEmailField, value: string) => {
    const fieldSchema = ComposeEmailFormSchema.shape[field];
    const parsed = fieldSchema.safeParse(value);

    if (parsed.success) {
      setClientErrors((prev) => {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return true;
    }

    const message = parsed.error.issues[0]?.message ?? "Valor inválido";
    setClientErrors((prev) => ({ ...prev, [field]: message }));
    return false;
  };

  // --- Valida todo el formulario en submit ---
  const validateForm = (values: ComposeEmailFormValues): boolean => {
    const parsed = ComposeEmailFormSchema.safeParse(values);

    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<ComposeEmailField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as ComposeEmailField;
      if (!field || nextErrors[field]) return;
      nextErrors[field] = issue.message;
    });
    setClientErrors(nextErrors);
    return false;
  };

  // --- Obtiene el error combinado de un campo ---
  const getError = (field: ComposeEmailField): FormFieldError | undefined => {
    const message = clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // --- Instancia de TanStack Form ---
  const form = useForm({
    defaultValues: EMPTY_VALUES,
    onSubmit: async ({ value }) => {
      if (!validateForm(value)) return;

      try {
        await sendEmail(value);
        form.reset(EMPTY_VALUES);
        setClientErrors({});
        onSuccess();
      } catch {
        // El error ya se notifica en useGoogleComposeEmail via toast.
        return;
      }
    },
  });

  // --- Limpia el formulario y los errores ---
  const handleReset = () => {
    form.reset(EMPTY_VALUES);
    setClientErrors({});
  };

  // --- Wrapper de submit para el evento DOM del formulario ---
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    form.handleSubmit();
  };

  return {
    form,
    isPending,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
