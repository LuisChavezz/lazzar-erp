"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "../../../utils/getFieldError";
import { SizeFormSchema, SizeFormValues } from "../schemas/size.schema";
import { useCreateSize } from "./useCreateSize";
import { useUpdateSize } from "./useUpdateSize";
import { Size } from "../interfaces/size.interface";

interface UseSizeFormParams {
  onSuccess: () => void;
  sizeToEdit?: Size | null;
}

type SizeFormField = keyof SizeFormValues;

export function useSizeForm({ onSuccess, sizeToEdit }: UseSizeFormParams) {
  // Determina si el formulario está en modo creación o edición.
  const isEditing = Boolean(sizeToEdit?.id);

  // Guarda referencia al formulario para ejecutar scroll superior al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Conserva estado local de envío para bloquear acciones durante submit.
  const [isLoading, setIsLoading] = useState(false);

  // Separa errores de validación local y errores devueltos por servidor.
  const [clientErrors, setClientErrors] = useState<Partial<Record<SizeFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<SizeFormField, string>>>({});

  // Define valores por defecto del formulario.
  const emptyValues = useMemo<SizeFormValues>(
    () => ({
      nombre: "",
    }),
    []
  );

  // Calcula valores iniciales cuando existe una talla en edición.
  const editValues = useMemo<SizeFormValues>(
    () =>
      sizeToEdit
        ? {
            nombre: sizeToEdit.nombre,
          }
        : emptyValues,
    [emptyValues, sizeToEdit]
  );

  // Mapea errores de mutaciones al estado de errores de servidor por campo.
  const setHookError = (field: SizeFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createSize, isPending: isCreating } = useCreateSize(setHookError);
  const { mutateAsync: updateSize, isPending: isUpdating } = useUpdateSize(setHookError);

  // Limpia errores de un campo cuando el usuario modifica su valor.
  const clearFieldErrors = (field: SizeFormField) => {
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

  // Valida un campo puntual al perder foco.
  const validateField = (field: SizeFormField, value: SizeFormValues[SizeFormField]) => {
    const fieldSchema = SizeFormSchema.shape[field];
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

  // Ejecuta validación completa antes de enviar datos.
  const validateForm = (values: SizeFormValues) => {
    const parsed = SizeFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<SizeFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as SizeFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  // Prioriza el mensaje de servidor y mantiene compatibilidad con FormInput.
  const getError = (field: SizeFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // Orquesta submit manteniendo el flujo original de crear/editar.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      setIsLoading(true);
      try {
        const payload = {
          nombre: value.nombre.toUpperCase(),
        };

        if (isEditing && sizeToEdit) {
          await updateSize({ id: sizeToEdit.id, ...payload });
        } else {
          await createSize(payload);
        }

        onSuccess();
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Sincroniza valores cuando cambia la talla seleccionada para edición.
  useEffect(() => {
    form.reset(isEditing ? editValues : emptyValues);
  }, [editValues, emptyValues, form, isEditing]);

  // Combina estados de carga para bloquear interacción visual.
  const isPending = isCreating || isUpdating || isLoading;

  // Limpia formulario y errores, luego desplaza suavemente al inicio.
  const handleReset = () => {
    form.reset(isEditing ? editValues : emptyValues);
    setClientErrors({});
    setServerErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Encapsula submit del elemento form y delega en TanStack Form.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Mantiene una key estable para remount al cambiar entre modos.
  const formKey = isEditing ? `size-edit-${sizeToEdit?.id ?? "ready"}` : "size-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
