"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FiscalAddressSchema, FiscalAddressFormValues } from "../schemas/fiscal-address.schema";
import { useSatStore } from "../stores/sat.store";

interface UseFiscalAddressFormParams {
  onSuccess: () => void;
}

type FiscalAddressFormField = keyof FiscalAddressFormValues;
type FieldErrorLike = { type: string; message?: string };

export function useFiscalAddressForm({ onSuccess }: UseFiscalAddressFormParams) {
  // Obtiene datos persistidos de dirección fiscal y su actualizador.
  const { fiscalAddress, setFiscalAddress } = useSatStore();

  // Conserva una referencia al formulario para ejecutar scroll superior al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Controla estado de envío para bloquear acciones y mantener feedback visual.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mantiene errores de validación por campo separados del estado del input.
  const [errors, setErrors] = useState<Partial<Record<FiscalAddressFormField, string>>>({});

  // Define valores base con el mismo estado inicial del formulario original.
  const defaultValues = useMemo<FiscalAddressFormValues>(
    () => ({
      calle: "",
      numero_exterior: "",
      numero_interior: "",
      colonia: "",
      localidad: "",
      municipio: "",
      estado: "",
      pais: "México",
      codigo_postal: "",
    }),
    []
  );

  // Resuelve mensaje de error para cada campo según contrato de los componentes visuales.
  const getError = (field: FiscalAddressFormField): FieldErrorLike | undefined => {
    const message = errors[field];
    return message ? { type: "manual", message } : undefined;
  };

  // Limpia error de un campo al cambiar su valor para mantener experiencia fluida.
  const clearFieldError = (field: FiscalAddressFormField) => {
    setErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Ejecuta validación de campo individual al perder foco.
  const validateField = (
    field: FiscalAddressFormField,
    value: FiscalAddressFormValues[FiscalAddressFormField]
  ) => {
    const fieldSchema = FiscalAddressSchema.shape[field];
    const parsed = fieldSchema.safeParse(value);

    if (parsed.success) {
      clearFieldError(field);
      return true;
    }

    const message = parsed.error.issues[0]?.message ?? "Valor inválido";
    setErrors((prev) => ({ ...prev, [field]: message }));
    return false;
  };

  // Aplica validación completa antes del submit para preservar el flujo de guardado.
  const validateForm = (values: FiscalAddressFormValues) => {
    const parsed = FiscalAddressSchema.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return true;
    }

    const nextErrors: Partial<Record<FiscalAddressFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as FiscalAddressFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setErrors(nextErrors);
    return false;
  };

  // Centraliza submit: valida, simula latencia, persiste en store y dispara éxito.
  const form = useForm({
    defaultValues: fiscalAddress ?? defaultValues,
    onSubmit: async ({ value }) => {
      if (!validateForm(value)) {
        return;
      }

      setIsSubmitting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setFiscalAddress(value);
        onSuccess();
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Sincroniza formulario cuando cambia la dirección fiscal persistida.
  useEffect(() => {
    form.reset(fiscalAddress ?? defaultValues);
  }, [defaultValues, fiscalAddress, form]);

  // Restablece valores base, limpia errores y hace scroll superior suave.
  const handleReset = () => {
    form.reset(defaultValues);
    setErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Delega submit DOM al submit de TanStack Form.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    formRef,
    isSubmitting,
    getError,
    clearFieldError,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
