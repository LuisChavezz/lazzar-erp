"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "../../../utils/getFieldError";
import { ColorFormSchema, ColorFormValues } from "../schemas/color.schema";
import { useCreateColor } from "./useCreateColor";
import { useUpdateColor } from "./useUpdateColor";
import { Color } from "../interfaces/color.interface";

interface UseColorFormParams {
  onSuccess: () => void;
  colorToEdit?: Color | null;
}

type ColorFormField = keyof ColorFormValues;

export function useColorForm({ onSuccess, colorToEdit }: UseColorFormParams) {
  // Determina modo creación/edición para mantener el flujo existente.
  const isEditing = Boolean(colorToEdit?.id);

  // Conserva referencia al form para scroll superior suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Mantiene estado local de envío para bloquear controles durante submit.
  const [isLoading, setIsLoading] = useState(false);

  // Separa errores de validación cliente y servidor para cada campo.
  const [clientErrors, setClientErrors] = useState<Partial<Record<ColorFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<ColorFormField, string>>>({});

  // Define valores vacíos del formulario.
  const emptyValues = useMemo<ColorFormValues>(
    () => ({
      nombre: "",
      codigo_hex: "FAFAFA",
    }),
    []
  );

  // Deriva valores de edición.
  const editValues = useMemo<ColorFormValues>(
    () =>
      colorToEdit
        ? {
            nombre: colorToEdit.nombre,
            codigo_hex: colorToEdit.codigo_hex,
          }
        : emptyValues,
    [colorToEdit, emptyValues]
  );

  // Mantiene valor para vista previa del color.
  const [selectedHex, setSelectedHex] = useState(isEditing ? editValues.codigo_hex : emptyValues.codigo_hex);

  // Recibe errores de mutaciones y los asigna al estado de servidor.
  const setHookError = (field: ColorFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createColor, isPending: isCreating } = useCreateColor(setHookError);
  const { mutateAsync: updateColor, isPending: isUpdating } = useUpdateColor(setHookError);

  // Limpia errores del campo cuando cambia su valor.
  const clearFieldErrors = (field: ColorFormField) => {
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

  // Valida un solo campo en blur.
  const validateField = (field: ColorFormField, value: ColorFormValues[ColorFormField]) => {
    const fieldSchema = ColorFormSchema.shape[field];
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

  // Valida todo el formulario antes de mutar.
  const validateForm = (values: ColorFormValues) => {
    const parsed = ColorFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<ColorFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as ColorFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  // Entrega error compatible con componentes visuales actuales.
  const getError = (field: ColorFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // Controla submit con la misma lógica original.
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
          nombre: value.nombre,
          codigo_hex: value.codigo_hex.toUpperCase(),
        };

        if (isEditing && colorToEdit) {
          await updateColor({ id: colorToEdit.id, ...payload });
        } else {
          await createColor(payload);
        }

        onSuccess();
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Sincroniza valores y vista previa cuando cambia la entidad en edición.
  useEffect(() => {
    const nextValues = isEditing ? editValues : emptyValues;
    form.reset(nextValues);
    setSelectedHex(nextValues.codigo_hex);
  }, [editValues, emptyValues, form, isEditing]);

  // Expone estado combinado de carga/mutación.
  const isPending = isCreating || isUpdating || isLoading;

  // Actualiza el valor HEX y la vista previa al escribir.
  const updateHexValue = (value: string, handleChange: (value: string) => void) => {
    handleChange(value);
    setSelectedHex(value);
    clearFieldErrors("codigo_hex");
  };

  // Limpia estado y hace scroll superior suave.
  const handleReset = () => {
    const nextValues = isEditing ? editValues : emptyValues;
    form.reset(nextValues);
    setClientErrors({});
    setServerErrors({});
    setSelectedHex(nextValues.codigo_hex);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Encapsula submit del form y delega en TanStack Form.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Mantiene key estable para remount entre crear y editar.
  const formKey = isEditing ? `color-edit-${colorToEdit?.id ?? "ready"}` : "color-new";

  return {
    form,
    formRef,
    formKey,
    isPending,
    isEditing,
    selectedHex,
    getError,
    clearFieldErrors,
    validateField,
    updateHexValue,
    handleReset,
    handleFormSubmit,
  };
}
