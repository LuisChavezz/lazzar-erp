"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import {
  CostCenterFormSchema,
  createEmptyCostCenterForm,
  type CostCenterFormValues,
} from "../schemas/cost-center.schema";
import type {
  CostCenter,
  CostCenterCreate,
} from "../interfaces/cost-center.interface";
import { useCreateCostCenter } from "./useCreateCostCenter";
import { useUpdateCostCenter } from "./useUpdateCostCenter";
import type { CostCenterFormField } from "./setCostCenterFieldErrors";

interface UseCostCenterFormParams {
  onSuccess: () => void;
  centroToEdit?: CostCenter | null;
}

/**
 * Valores del formulario a partir del centro en edición. `descripcion` es
 * nullable en el modelo y el `<textarea>` necesita un string, así que el `null`
 * se colapsa a `""`; el camino de vuelta lo hace el payload. `codigo` puede
 * llegar vacío en registros antiguos: se muestra tal cual y el esquema pedirá
 * capturarlo.
 */
const valuesFromCentro = (centro: CostCenter): CostCenterFormValues => ({
  codigo: centro.codigo ?? "",
  nombre: centro.nombre ?? "",
  descripcion: centro.descripcion ?? "",
});

/**
 * Formulario de alta y edición de un centro de costo.
 *
 * Los errores de CLIENTE (Zod) y de SERVIDOR (el 400 por campo) se guardan por
 * separado y `getError` da prioridad al del servidor: es el más reciente y el
 * que el usuario acaba de provocar. Editar el campo limpia los dos.
 *
 * NO sincroniza valores con un efecto: quien lo monta le pasa un `key` que
 * distingue alta de edición y el centro concreto, así que cambiar de registro
 * REMONTA el componente y los valores iniciales se leen de cero.
 */
export function useCostCenterForm({
  onSuccess,
  centroToEdit,
}: UseCostCenterFormParams) {
  const isEditing = Boolean(centroToEdit?.id);

  const formRef = useRef<HTMLFormElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [clientErrors, setClientErrors] = useState<
    Partial<Record<CostCenterFormField, string>>
  >({});
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<CostCenterFormField, string>>
  >({});

  // `useState` con inicializador: una sola instancia estable de los valores
  // iniciales, sin memoización manual (el React Compiler está activo).
  const [defaultValues] = useState<CostCenterFormValues>(() =>
    centroToEdit ? valuesFromCentro(centroToEdit) : createEmptyCostCenterForm(),
  );

  const setHookError = (
    field: CostCenterFormField,
    error: { message?: string },
  ) => {
    if (!error.message) return;
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createCentro, isPending: isCreating } =
    useCreateCostCenter(setHookError);
  const { mutateAsync: updateCentro, isPending: isUpdating } =
    useUpdateCostCenter(setHookError);

  /** Editar un campo retira su aviso, venga del cliente o del servidor. */
  const clearFieldErrors = (field: CostCenterFormField) => {
    setClientErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setServerErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  /** Valida UN campo (en blur) contra su propio esquema. */
  const validateField = (
    field: CostCenterFormField,
    value: CostCenterFormValues[CostCenterFormField],
  ) => {
    const parsed = CostCenterFormSchema.shape[field].safeParse(value);
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

  const getError = (field: CostCenterFormField): FormFieldError | undefined => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? { message } : undefined;
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      const parsed = CostCenterFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Partial<Record<CostCenterFormField, string>> = {};
        parsed.error.issues.forEach((issue) => {
          const field = issue.path[0] as CostCenterFormField;
          if (!field || nextErrors[field]) return;
          nextErrors[field] = issue.message;
        });
        setClientErrors(nextErrors);
        // Todos los campos son de primer nivel, así que la llave del error ya es
        // el `name` del control en el DOM.
        scrollToFirstValidationError(formRef.current, Object.keys(nextErrors));
        return;
      }
      setClientErrors({});

      setIsSubmitting(true);
      try {
        // `empresa` NO se envía (la resuelve el backend) y `activo` tampoco: al
        // ser PATCH, omitirlo es lo que CONSERVA la baja de un centro retirado.
        // `descripcion` viaja como `null` cuando queda vacía —el modelo la
        // declara nullable y un "" sería un valor basura—, igual que en áreas.
        const descripcion = parsed.data.descripcion.trim();
        const payload: CostCenterCreate = {
          codigo: parsed.data.codigo.trim().toUpperCase(),
          nombre: parsed.data.nombre.trim(),
          descripcion: descripcion ? descripcion : null,
        };

        if (isEditing && centroToEdit) {
          await updateCentro({ id: centroToEdit.id, ...payload });
        } else {
          await createCentro(payload);
        }

        onSuccess();
      } catch {
        // Los errores de campo ya se repartieron en `setHookError` y el toast
        // salió desde la mutación. Se captura para que el rechazo de
        // `mutateAsync` no escape por `void form.handleSubmit()` como unhandled
        // rejection — y, sobre todo, para NO cerrar el diálogo: el usuario tiene
        // que ver el aviso bajo el campo (p. ej. el código duplicado).
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const isPending = isSubmitting || isCreating || isUpdating;

  const handleReset = () => {
    form.reset(defaultValues);
    setClientErrors({});
    setServerErrors({});
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    formRef,
    isPending,
    isEditing,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
