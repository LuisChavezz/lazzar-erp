"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { FieldError } from "react-hook-form";
import { Currency } from "../interfaces/currency.interface";
import { useCreateCurrency } from "./useCreateCurrency";
import { useUpdateCurrency } from "./useUpdateCurrency";
import { CurrencyFormSchema, CurrencyFormValues } from "../schemas/currency.schema";

interface UseCurrencyFormParams {
  onSuccess: () => void;
  currencyToEdit?: Currency;
}

type CurrencyFormField = keyof CurrencyFormValues;

export function useCurrencyForm({ onSuccess, currencyToEdit }: UseCurrencyFormParams) {
  // Determina si el formulario está en modo edición según la moneda recibida.
  const isEditing = Boolean(currencyToEdit);

  // Separa errores de validación local y errores devueltos por backend.
  const [clientErrors, setClientErrors] = useState<Partial<Record<CurrencyFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<CurrencyFormField, string>>>({});

  // Valores base para modo creación.
  const emptyValues = useMemo<CurrencyFormValues>(
    () => ({
      nombre: "",
      codigo_iso: "",
      simbolo: "$",
      decimales: 2,
    }),
    []
  );

  // Valores derivados para modo edición.
  const editValues = useMemo<CurrencyFormValues>(() => {
    if (!currencyToEdit) {
      return emptyValues;
    }

    return {
      nombre: currencyToEdit.nombre,
      codigo_iso: currencyToEdit.codigo_iso,
      simbolo: currencyToEdit.simbolo,
      decimales: currencyToEdit.decimales,
    };
  }, [currencyToEdit, emptyValues]);

  // Adaptador de errores del backend hacia el estado de errores del formulario.
  const setHookError = (field: CurrencyFormField, error: { message?: string }) => {
    if (!error?.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createCurrency, isPending: isCreating } = useCreateCurrency(setHookError);
  const { mutateAsync: updateCurrency, isPending: isUpdating } = useUpdateCurrency(setHookError);

  // Limpia errores de un campo cuando cambia su valor.
  const clearFieldErrors = (field: CurrencyFormField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setServerErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Valida un solo campo (onBlur) usando su regla en Zod.
  const validateField = (field: CurrencyFormField, value: CurrencyFormValues[CurrencyFormField]) => {
    const fieldSchema = CurrencyFormSchema.shape[field];
    const parsed = fieldSchema.safeParse(value);
    if (parsed.success) {
      setClientErrors((prev) => {
        if (!(field in prev)) {
          return prev;
        }
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

  // Valida todo el formulario en submit y crea un mapa de errores por campo.
  const validateForm = (values: CurrencyFormValues) => {
    const parsed = CurrencyFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<CurrencyFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as CurrencyFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });
    setClientErrors(nextErrors);
    return false;
  };

  // Prioriza errores de backend sobre errores de cliente en la UI.
  const getError = (field: CurrencyFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FieldError) : undefined;
  };

  // TanStack Form concentra estado y submit manteniendo flujo original crear/editar.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      try {
        if (isEditing && currencyToEdit) {
          await updateCurrency({ ...currencyToEdit, ...value });
          onSuccess();
          return;
        }

        await createCurrency(value);
        form.reset(emptyValues);
        setClientErrors({});
        setServerErrors({});
        onSuccess();
      } catch {
        return;
      }
    },
  });

  // Sólo bloquea UI durante peticiones reales de red.
  const isPending = isCreating || isUpdating;

  // Restablece formulario según modo activo y limpia errores.
  const handleReset = () => {
    form.reset(isEditing ? editValues : emptyValues);
    setClientErrors({});
    setServerErrors({});
  };

  // Wrapper de submit para controlar eventos DOM.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Key estable para remontar correctamente cuando cambia entre crear/editar.
  const formKey = isEditing ? `currency-edit-${currencyToEdit?.id ?? "ready"}` : "currency-new";

  return {
    form,
    formKey,
    isEditing,
    isPending,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
