"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import {
  ChangePasswordFormSchema,
  type ChangePasswordFormValues,
} from "@/src/features/settings/schemas/change-password-form.schema";

type ChangePasswordField = keyof ChangePasswordFormValues;

const emptyValues: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function useChangePasswordForm() {
  // Mantiene errores por campo para adaptarlos al contrato visual de FormInput.
  const [errors, setErrors] = useState<Partial<Record<ChangePasswordField, string>>>({});

  // Controla estado de envío para bloquear doble submit y alimentar el botón pending.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expone error por campo en el formato esperado por los componentes reutilizables.
  const getError = (field: ChangePasswordField): FormFieldError | undefined => {
    const message = errors[field];
    return message ? { message } : undefined;
  };

  // Limpia error puntual cuando el usuario actualiza el valor del control.
  const clearFieldError = (field: ChangePasswordField) => {
    setErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Valida el formulario completo con Zod y proyecta issues a errores por campo.
  const validateForm = (values: ChangePasswordFormValues) => {
    const parsed = ChangePasswordFormSchema.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return true;
    }

    const nextErrors: Partial<Record<ChangePasswordField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as ChangePasswordField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });
    setErrors(nextErrors);
    return false;
  };

  // Orquesta submit con TanStack Form manteniendo el flujo original de éxito/error.
  const form = useForm({
    defaultValues: emptyValues,
    onSubmit: async ({ value }) => {
      if (!validateForm(value)) {
        return;
      }

      try {
        await Promise.resolve(value);
        toast.success("Contraseña actualizada correctamente");
      } catch {
        toast.error("No se pudo actualizar la contraseña");
      }
    },
  });

  // Encapsula submit DOM para delegarlo a TanStack y proteger contra doble ejecución.
  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await Promise.resolve(form.handleSubmit());
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estado final de pending usado por el botón de envío.
  const isPending = isSubmitting || form.state.isSubmitting;

  // Contrato público del hook para dejar el componente enfocado en render.
  return {
    form,
    isPending,
    getError,
    clearFieldError,
    handleFormSubmit,
  };
}
