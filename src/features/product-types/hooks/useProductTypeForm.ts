"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "../../../utils/getFieldError";
import { ProductTypeFormSchema, ProductTypeFormValues } from "../schemas/product-type.schema";
import { useCreateProductType } from "./useCreateProductType";
import { useUpdateProductType } from "./useUpdateProductType";
import { ProductType } from "../interfaces/product-type.interface";

interface UseProductTypeFormParams {
  onSuccess: () => void;
  productTypeToEdit?: ProductType | null;
}

type ProductTypeFormField = keyof ProductTypeFormValues;

export function useProductTypeForm({ onSuccess, productTypeToEdit }: UseProductTypeFormParams) {
  // Determina el modo del formulario para preservar flujo de creación/edición.
  const isEditing = Boolean(productTypeToEdit?.id);

  // Guarda referencia al formulario para ejecutar scroll superior al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Mantiene estado local de envío, consistente con la implementación original.
  const [isLoading, setIsLoading] = useState(false);

  // Separa errores de cliente y servidor para mostrarlos por campo.
  const [clientErrors, setClientErrors] = useState<Partial<Record<ProductTypeFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<ProductTypeFormField, string>>>({});

  // Define valores vacíos para modo creación.
  const emptyValues = useMemo<ProductTypeFormValues>(
    () => ({
      codigo: "",
    }),
    []
  );

  // Deriva valores para modo edición.
  const editValues = useMemo<ProductTypeFormValues>(
    () => (productTypeToEdit ? { codigo: productTypeToEdit.codigo } : emptyValues),
    [emptyValues, productTypeToEdit]
  );

  // Traduce errores de mutaciones al estado local de errores de servidor.
  const setHookError = (field: ProductTypeFormField, error: { message?: string }) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createProductType, isPending: isCreating } = useCreateProductType(setHookError);
  const { mutateAsync: updateProductType, isPending: isUpdating } = useUpdateProductType(setHookError);

  // Limpia errores de un campo cuando su valor cambia.
  const clearFieldErrors = (field: ProductTypeFormField) => {
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
  const validateField = (field: ProductTypeFormField, value: ProductTypeFormValues[ProductTypeFormField]) => {
    const fieldSchema = ProductTypeFormSchema.shape[field];
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

  // Ejecuta validación completa antes de iniciar mutaciones.
  const validateForm = (values: ProductTypeFormValues) => {
    const parsed = ProductTypeFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<ProductTypeFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as ProductTypeFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  // Entrega error compatible con componentes visuales existentes.
  const getError = (field: ProductTypeFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // Centraliza submit para crear o actualizar sin alterar el comportamiento actual.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      setIsLoading(true);
      try {
        if (isEditing && productTypeToEdit) {
          await updateProductType({
            id: productTypeToEdit.id,
            codigo: value.codigo,
          });
          form.reset(editValues);
        } else {
          await createProductType({ codigo: value.codigo });
          form.reset(emptyValues);
        }
        onSuccess();
      } catch {
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Sincroniza los valores si cambia la entidad editada.
  useEffect(() => {
    if (!isEditing) {
      return;
    }
    form.reset(editValues);
  }, [editValues, form, isEditing]);

  // Expone estado de bloqueo combinado.
  const isPending = isCreating || isUpdating || isLoading;

  // Restablece formulario y errores; luego ejecuta scroll superior suave.
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

  // Mantiene key estable para remount al alternar entre crear y editar.
  const formKey = isEditing ? `product-type-edit-${productTypeToEdit?.id ?? "ready"}` : "product-type-new";

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
