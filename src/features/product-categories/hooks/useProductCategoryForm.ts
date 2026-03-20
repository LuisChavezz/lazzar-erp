"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "../../../utils/getFieldError";
import {
  ProductCategoryFormSchema,
  ProductCategoryFormValues,
} from "../schemas/product-category.schema";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCreateProductCategory } from "./useCreateProductCategory";
import { useUpdateProductCategory } from "./useUpdateProductCategory";
import { ProductCategory } from "../interfaces/product-category.interface";

interface UseProductCategoryFormParams {
  onSuccess: () => void;
  categoryToEdit?: ProductCategory | null;
}

type ProductCategoryFormField = keyof ProductCategoryFormValues;

export function useProductCategoryForm({
  onSuccess,
  categoryToEdit,
}: UseProductCategoryFormParams) {
  // Obtiene empresa activa para construir payloads de creación y edición.
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);

  // Determina el modo del formulario para conservar el flujo original.
  const isEditing = Boolean(categoryToEdit?.id);

  // Mantiene referencia al formulario para realizar scroll superior al limpiar.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Replica estado de carga local del flujo original durante submit.
  const [isLoading, setIsLoading] = useState(false);

  // Separa errores de cliente y servidor para renderizado por campo.
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<ProductCategoryFormField, string>>
  >({});
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<ProductCategoryFormField, string>>
  >({});

  // Define valores iniciales para modo creación.
  const emptyValues = useMemo<ProductCategoryFormValues>(
    () => ({
      nombre: "",
      codigo: "",
      descripcion: "",
    }),
    []
  );

  // Deriva valores de edición con la misma estructura del formulario original.
  const editValues = useMemo<ProductCategoryFormValues>(
    () =>
      categoryToEdit
        ? {
            nombre: categoryToEdit.nombre,
            codigo: categoryToEdit.codigo,
            descripcion: categoryToEdit.descripcion ?? "",
          }
        : emptyValues,
    [categoryToEdit, emptyValues]
  );

  // Traduce errores de mutación al estado de errores de servidor.
  const setHookError = (
    field: ProductCategoryFormField,
    error: { message?: string }
  ) => {
    if (!error.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createCategory, isPending: isCreating } =
    useCreateProductCategory(setHookError);
  const { mutateAsync: updateCategory, isPending: isUpdating } =
    useUpdateProductCategory(setHookError);

  // Limpia errores asociados a un campo cuando su valor cambia.
  const clearFieldErrors = (field: ProductCategoryFormField) => {
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

  // Valida un campo puntual en blur para mantener feedback inmediato.
  const validateField = (
    field: ProductCategoryFormField,
    value: ProductCategoryFormValues[ProductCategoryFormField]
  ) => {
    const fieldSchema = ProductCategoryFormSchema.shape[field];
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

  // Valida todo el formulario antes de enviar mutaciones.
  const validateForm = (values: ProductCategoryFormValues) => {
    const parsed = ProductCategoryFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<ProductCategoryFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as ProductCategoryFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);
    return false;
  };

  // Prioriza errores de servidor y mantiene contrato visual de FormInput.
  const getError = (field: ProductCategoryFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // Ejecuta submit con la misma lógica de creación y edición.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      setIsLoading(true);
      try {
        const descripcion = value.descripcion?.trim() ?? "";

        if (isEditing && categoryToEdit) {
          await updateCategory({
            id: categoryToEdit.id,
            empresa: categoryToEdit.empresa ?? selectedCompany.id!,
            nombre: value.nombre,
            codigo: value.codigo,
            descripcion,
          });
          form.reset(editValues);
        } else {
          await createCategory({
            empresa: selectedCompany.id!,
            nombre: value.nombre,
            codigo: value.codigo,
            descripcion,
          });
          form.reset(emptyValues);
        }
        onSuccess();
      } catch {
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Sincroniza formulario cuando cambia la categoría en edición.
  useEffect(() => {
    if (!isEditing) {
      return;
    }
    form.reset(editValues);
  }, [editValues, form, isEditing]);

  // Expone estado de bloqueo combinado de mutaciones y submit local.
  const isPending = isCreating || isUpdating || isLoading;

  // Limpia formulario y errores, luego realiza scroll superior suave.
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

  // Mantiene key estable para remount al cambiar entre crear y editar.
  const formKey = isEditing
    ? `product-category-edit-${categoryToEdit?.id ?? "ready"}`
    : "product-category-new";

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
