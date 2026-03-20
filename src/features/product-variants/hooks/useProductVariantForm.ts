"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "../../../utils/getFieldError";
import { ProductVariantFormSchema, ProductVariantFormValues } from "../schemas/product-variant.schema";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useProducts } from "../../products/hooks/useProducts";
import { useColors } from "../../colors/hooks/useColors";
import { useSizes } from "../../sizes/hooks/useSizes";
import { useCreateProductVariant } from "./useCreateProductVariant";
import { useUpdateProductVariant } from "./useUpdateProductVariant";
import { ProductVariant } from "../interfaces/product-variant.interface";

interface UseProductVariantFormParams {
  onSuccess: () => void;
  productVariantToEdit?: ProductVariant | null;
}

type ProductVariantFormField = keyof ProductVariantFormValues;

export function useProductVariantForm({
  onSuccess,
  productVariantToEdit,
}: UseProductVariantFormParams) {
  // Obtiene la empresa seleccionada para enviar el payload correcto.
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);

  // Carga catálogos necesarios para construir los selectores.
  const { products, isLoading: isLoadingProducts } = useProducts();
  const { colors, isLoading: isLoadingColors } = useColors();
  const { sizes, isLoading: isLoadingSizes } = useSizes();

  // Mantiene los mismos criterios de disponibilidad del formulario original.
  const activeProducts = useMemo(() => products.filter((product) => product.activo), [products]);
  const activeColors = colors;
  const activeSizes = sizes;

  // Define los prerequisitos de catálogos para habilitar el formulario.
  const missingItems = useMemo(
    () =>
      [
        activeProducts.length === 0 && !isLoadingProducts ? "Productos" : null,
        activeColors.length === 0 && !isLoadingColors ? "Colores" : null,
        activeSizes.length === 0 && !isLoadingSizes ? "Tallas" : null,
      ].filter((item): item is string => Boolean(item)),
    [activeColors.length, activeProducts.length, activeSizes.length, isLoadingColors, isLoadingProducts, isLoadingSizes]
  );

  // Detecta si el formulario está en modo edición.
  const isEditing = Boolean(productVariantToEdit?.id);

  // Mantiene referencias visuales y preferencia de captura continua.
  const formRef = useRef<HTMLFormElement | null>(null);
  const [keepCreating, setKeepCreating] = useState(false);

  // Separa errores locales de validación y errores mapeados desde backend.
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<ProductVariantFormField, string>>
  >({});
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<ProductVariantFormField, string>>
  >({});

  // Define valores base para registros nuevos.
  const emptyValues = useMemo<ProductVariantFormValues>(
    () => ({
      producto: 0,
      color: 0,
      talla: 0,
      sku: "",
      precio_base: "",
      activo: true,
    }),
    []
  );

  // Normaliza valores de edición para evitar IDs no disponibles.
  const editValues = useMemo<ProductVariantFormValues>(() => {
    if (!productVariantToEdit) {
      return emptyValues;
    }

    const hasProduct = activeProducts.some((product) => product.id === productVariantToEdit.producto);
    const hasColor = activeColors.some((color) => color.id === productVariantToEdit.color);
    const hasSize = activeSizes.some((size) => size.id === productVariantToEdit.talla);

    return {
      producto: hasProduct ? productVariantToEdit.producto : 0,
      color: hasColor ? productVariantToEdit.color : 0,
      talla: hasSize ? productVariantToEdit.talla : 0,
      sku: productVariantToEdit.sku,
      precio_base: productVariantToEdit.precio_base,
      activo: productVariantToEdit.activo,
    };
  }, [activeColors, activeProducts, activeSizes, emptyValues, productVariantToEdit]);

  // Mapea errores de mutación por campo para mostrarlos en componentes actuales.
  const setHookError = (field: ProductVariantFormField, error: { message?: string }) => {
    if (!error?.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createProductVariant, isPending: isCreating } =
    useCreateProductVariant(setHookError);
  const { mutateAsync: updateProductVariant, isPending: isUpdating } =
    useUpdateProductVariant(setHookError);

  // Limpia errores al modificar cada campo.
  const clearFieldErrors = (field: ProductVariantFormField) => {
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

  // Valida en blur usando regla individual del schema.
  const validateField = (
    field: ProductVariantFormField,
    value: ProductVariantFormValues[ProductVariantFormField]
  ) => {
    const fieldSchema = ProductVariantFormSchema.shape[field];
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

  // Valida el formulario completo antes de intentar la mutación.
  const validateForm = (values: ProductVariantFormValues) => {
    const parsed = ProductVariantFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<ProductVariantFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as ProductVariantFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });
    setClientErrors(nextErrors);
    return false;
  };

  // Unifica la lectura de errores para mantener compatibilidad visual.
  const getError = (field: ProductVariantFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // Centraliza el flujo submit en creación/edición manteniendo comportamiento actual.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      try {
        if (isEditing && productVariantToEdit) {
          await updateProductVariant({
            id: productVariantToEdit.id,
            empresa: productVariantToEdit.empresa ?? selectedCompany.id!,
            ...value,
          });
          form.reset(editValues);
          onSuccess();
          return;
        }

        await createProductVariant({
          empresa: selectedCompany.id!,
          ...value,
        });

        if (keepCreating) {
          form.reset({
            ...value,
            sku: "",
          });
          setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 0);
          return;
        }

        form.reset(emptyValues);
        onSuccess();
      } catch {
        return;
      }
    },
  });

  // Sincroniza datos de edición cuando cambian catálogos o entidad a editar.
  useEffect(() => {
    if (!isEditing) {
      return;
    }
    form.reset(editValues);
  }, [editValues, form, isEditing]);

  // Expone estado de bloqueo unificado.
  const isPending = isCreating || isUpdating;

  // Restablece el formulario y realiza scroll superior suave al limpiar.
  const handleReset = () => {
    form.reset(isEditing ? editValues : emptyValues);
    setClientErrors({});
    setServerErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Encapsula submit del elemento form para delegar en TanStack Form.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Define key estable para remount al cambiar entre creación y edición.
  const formKey = isEditing
    ? `product-variant-edit-${productVariantToEdit?.id ?? "ready"}`
    : "product-variant-new";

  return {
    form,
    formRef,
    formKey,
    selectedCompany,
    isEditing,
    isPending,
    keepCreating,
    setKeepCreating,
    missingItems,
    activeProducts,
    activeColors,
    activeSizes,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
