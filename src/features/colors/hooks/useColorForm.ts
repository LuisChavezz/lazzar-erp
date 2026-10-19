"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useFormFieldErrors } from "@/src/hooks/useFormFieldErrors";
import { ColorFormSchema, ColorFormValues } from "../schemas/color.schema";
import { useCreateColor } from "./useCreateColor";
import { useUpdateColor } from "./useUpdateColor";
import { Color, ColorCreate } from "../interfaces/color.interface";
import { toApiHex, toFormHex } from "../utils/colorHex";

interface UseColorFormParams {
  onSuccess: () => void;
  colorToEdit?: Color | null;
}

type ColorFormField = keyof ColorFormValues;

/**
 * Alta y edición de un color (mismo formulario).
 *
 * - `codigo` forma parte del SKU que genera el backend: se captura en el alta y
 *   es de solo lectura en la edición, porque cambiarlo desfasaría los SKU ya
 *   generados. La edición es un PUT (cuerpo completo), así que lo reenvía tal
 *   como venía.
 * - `codigo_hex` viaja siempre como `#RRGGBB` (ver `utils/colorHex.ts`).
 */
export function useColorForm({ onSuccess, colorToEdit }: UseColorFormParams) {
  // Determina modo creación/edición para mantener el flujo existente.
  const isEditing = Boolean(colorToEdit?.id);

  // Conserva referencia al form para scroll superior suave al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Envío en curso, síncrono (ver `onSubmit`).
  const submittingRef = useRef(false);

  // Mantiene estado local de envío para bloquear controles durante submit.
  const [isLoading, setIsLoading] = useState(false);

  // Errores por campo (de cliente y de servidor): ver `useFormFieldErrors`.
  const {
    getError,
    setServerFieldError,
    setClientFieldError,
    clearClientFieldError,
    clearFieldErrors,
    replaceClientErrors,
    clearServerErrors,
    clearAllErrors,
  } = useFormFieldErrors<ColorFormField>();

  // Define valores vacíos del formulario.
  const emptyValues = useMemo<ColorFormValues>(
    () => ({
      nombre: "",
      codigo: "",
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
            codigo: colorToEdit.codigo,
            codigo_hex: toFormHex(colorToEdit.codigo_hex),
          }
        : emptyValues,
    [colorToEdit, emptyValues]
  );

  // Clave para forzar remount del picker al resetear manualmente.
  const [resetCounter, setResetCounter] = useState(0);

  const { mutateAsync: createColor, isPending: isCreating } = useCreateColor(setServerFieldError);
  const { mutateAsync: updateColor, isPending: isUpdating } = useUpdateColor(setServerFieldError);

  // Valida un solo campo en blur.
  const validateField = (field: ColorFormField, value: ColorFormValues[ColorFormField]) => {
    const parsed = ColorFormSchema.shape[field].safeParse(value);
    if (parsed.success) {
      clearClientFieldError(field);
      return true;
    }
    setClientFieldError(field, parsed.error.issues[0]?.message ?? "Valor inválido");
    return false;
  };

  /** El envío en sí, sin la guarda de doble envío (vive en `onSubmit`). */
  const submitColor = async (value: ColorFormValues) => {
    clearServerErrors();

    const parsed = ColorFormSchema.safeParse(value);
    if (!parsed.success) {
      const nextErrors: Partial<Record<ColorFormField, string>> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as ColorFormField;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      });
      replaceClientErrors(nextErrors);
      return;
    }
    replaceClientErrors({});

    setIsLoading(true);
    try {
      const payload: ColorCreate = {
        nombre: parsed.data.nombre,
        // En la edición el campo es de solo lectura: se reenvía el original.
        codigo: isEditing && colorToEdit ? colorToEdit.codigo : parsed.data.codigo,
        codigo_hex: toApiHex(parsed.data.codigo_hex),
      };

      if (isEditing && colorToEdit) {
        await updateColor({ id: colorToEdit.id, ...payload });
      } else {
        await createColor(payload);
      }

      onSuccess();
    } catch {
      // El `onError` de la mutación ya avisó con el toast y pintó los errores
      // por campo; el diálogo sigue abierto con lo capturado. Sin este catch
      // el rechazo de `mutateAsync` escaparía sin manejar.
    } finally {
      setIsLoading(false);
    }
  };

  // Controla submit con la misma lógica original.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      // Guarda SÍNCRONA contra el doble envío en el mismo tick: `isPending`
      // deshabilita el formulario hasta el siguiente render, y el alta no es
      // idempotente (dos POST = dos colores).
      if (submittingRef.current) return;
      submittingRef.current = true;
      try {
        await submitColor(value);
      } finally {
        submittingRef.current = false;
      }
    },
  });

  // Sincroniza valores cuando cambia la entidad en edición.
  useEffect(() => {
    const nextValues = isEditing ? editValues : emptyValues;
    form.reset(nextValues);
  }, [editValues, emptyValues, form, isEditing]);

  // Expone estado combinado de carga/mutación.
  const isPending = isCreating || isUpdating || isLoading;

  // Limpia estado, reinicia picker y hace scroll superior suave.
  const handleReset = () => {
    const nextValues = isEditing ? editValues : emptyValues;
    form.reset(nextValues);
    clearAllErrors();
    setResetCounter((prev) => prev + 1);
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

  // Combina el formKey con el resetCounter para el picker.
  const pickerKey = `${formKey}-${resetCounter}`;

  return {
    form,
    formRef,
    formKey,
    pickerKey,
    isPending,
    isEditing,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
