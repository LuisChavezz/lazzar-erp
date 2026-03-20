"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { ProfileFormSchema, type ProfileFormValues } from "@/src/features/settings/schemas/profile-form.schema";

interface UseProfileFormParams {
  fullName: string;
  email: string;
}

type ProfileFormField = keyof ProfileFormValues;

const defaultBiography = "Gerencia comercial enfocada en operaciones y crecimiento.";

const emptyValues: ProfileFormValues = {
  fullName: "",
  email: "",
  biography: "",
};

export function useProfileForm({ fullName, email }: UseProfileFormParams) {
  // Deriva valores iniciales para edición conservando el flujo original del formulario.
  const editValues = useMemo<ProfileFormValues>(
    () => ({
      fullName: fullName.trim(),
      email: email.trim(),
      biography: defaultBiography,
    }),
    [email, fullName]
  );

  // Determina si el formulario debe operar con valores de edición o vacíos.
  const isEditing = Boolean(editValues.fullName || editValues.email);

  // Mantiene estado local de errores adaptado al contrato visual de inputs/textarea.
  const [errors, setErrors] = useState<Partial<Record<ProfileFormField, string>>>({});

  // Controla submit para evitar dobles envíos y sincronizar estado de botón.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expone errores por campo en formato compatible con componentes reutilizables.
  const getError = (field: ProfileFormField): FormFieldError | undefined => {
    const message = errors[field];
    return message ? { message } : undefined;
  };

  // Limpia error puntual cuando el usuario modifica el valor correspondiente.
  const clearFieldError = (field: ProfileFormField) => {
    setErrors((prev) => {
      if (!(field in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Ejecuta validación completa con Zod y proyecta errores por cada control.
  const validateForm = (values: ProfileFormValues) => {
    const parsed = ProfileFormSchema.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return true;
    }

    const nextErrors: Partial<Record<ProfileFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as ProfileFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setErrors(nextErrors);
    return false;
  };

  // Centraliza submit en TanStack Form manteniendo toasts y control de errores.
  const form = useForm({
    defaultValues: emptyValues,
    onSubmit: async ({ value }) => {
      if (!validateForm(value)) {
        return;
      }

      try {
        await Promise.resolve(value);
        toast.success("Perfil actualizado correctamente");
      } catch {
        toast.error("No se pudo actualizar el perfil");
      }
    },
  });

  // Sincroniza el formulario cuando cambian datos externos del perfil.
  useEffect(() => {
    form.reset(isEditing ? editValues : emptyValues);
    setErrors({});
  }, [editValues, form, isEditing]);

  // Encapsula submit DOM y delega ejecución al flujo de TanStack Form.
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

  // Estado pending final usado por acciones de guardado en UI.
  const isPending = isSubmitting || form.state.isSubmitting;

  // Contrato público consumido por ProfileForm para mantenerlo centrado en presentación.
  return {
    form,
    isPending,
    getError,
    clearFieldError,
    handleFormSubmit,
  };
}
