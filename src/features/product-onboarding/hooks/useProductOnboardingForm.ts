"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { toSendableDecimal } from "@/src/utils/decimal";
import { useProductCategories } from "../../product-categories/hooks/useProductCategories";
import { useProductTypes } from "../../product-types/hooks/useProductTypes";
import {
  ProductOnboardingFormSchema,
  createEmptyProductOnboardingForm,
  type ProductOnboardingFormField,
  type ProductOnboardingFormValues,
} from "../schemas/product-onboarding.schema";
import type {
  ProductOnboardingPayload,
  ProductOnboardingResult,
} from "../interfaces/product-onboarding.interface";
import { useCreateProductOnboarding } from "./useCreateProductOnboarding";

/**
 * Formulario de alta rápida de producto.
 *
 * Mismo esquema que `useCostCenterForm`: errores de CLIENTE (Zod) y de
 * SERVIDOR (400 por campo) separados, con prioridad al del servidor; editar un
 * campo limpia ambos.
 *
 * Catálogos: se REUTILIZAN `useProductTypes` (global) y `useProductCategories`
 * (el backend ya acota el listado a la empresa del usuario y a las activas).
 *
 * Tras el 201 el formulario no se cierra: guarda el producto creado en
 * `createdProduct` para que la UI muestre el `codigo` que asignó el servidor.
 */
export function useProductOnboardingForm() {
  const { categories, isLoading: isLoadingCategories, isError: isCategoriesError, error: categoriesError } =
    useProductCategories();
  const { productTypes, isLoading: isLoadingTypes, isError: isTypesError, error: typesError } =
    useProductTypes();

  const formRef = useRef<HTMLFormElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<ProductOnboardingResult | null>(null);

  const [clientErrors, setClientErrors] = useState<
    Partial<Record<ProductOnboardingFormField, string>>
  >({});
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<ProductOnboardingFormField, string>>
  >({});

  const [defaultValues] = useState<ProductOnboardingFormValues>(createEmptyProductOnboardingForm);

  const setHookError = (
    field: ProductOnboardingFormField,
    error: { message?: string },
  ) => {
    if (!error.message) return;
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createProduct, isPending: isCreating } =
    useCreateProductOnboarding(setHookError);

  const isLoadingCatalogs = isLoadingCategories || isLoadingTypes;
  const catalogsError = isCategoriesError ? categoriesError : isTypesError ? typesError : null;

  // Solo se reporta un catálogo como faltante cuando cargó bien y vino vacío:
  // un error de red no significa que no existan registros.
  const missingItems = [
    !isLoadingCategories && !isCategoriesError && categories.length === 0
      ? "Categorías de producto"
      : null,
    !isLoadingTypes && !isTypesError && productTypes.length === 0 ? "Tipos de producto" : null,
  ].filter((item): item is string => Boolean(item));

  /** Editar un campo retira su aviso, venga del cliente o del servidor. */
  const clearFieldErrors = (field: ProductOnboardingFormField) => {
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
    field: ProductOnboardingFormField,
    value: ProductOnboardingFormValues[ProductOnboardingFormField],
  ) => {
    const parsed = ProductOnboardingFormSchema.shape[field].safeParse(value);
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

  const getError = (field: ProductOnboardingFormField): FormFieldError | undefined => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? { message } : undefined;
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      const parsed = ProductOnboardingFormSchema.safeParse(value);
      if (!parsed.success) {
        const nextErrors: Partial<Record<ProductOnboardingFormField, string>> = {};
        parsed.error.issues.forEach((issue) => {
          const field = issue.path[0] as ProductOnboardingFormField;
          if (!field || nextErrors[field]) return;
          nextErrors[field] = issue.message;
        });
        setClientErrors(nextErrors);
        scrollToFirstValidationError(formRef.current, Object.keys(nextErrors));
        return;
      }
      setClientErrors({});

      setIsSubmitting(true);
      try {
        // Exactamente los cuatro campos del serializer: nada de `codigo`,
        // `descripcion` ni `empresa` (ver `ProductOnboardingPayload`).
        // `FormInput` ya capitaliza `nombre` al teclear/pegar; el
        // `toUpperCase` aquí garantiza que lo ENVIADO vaya en mayúsculas aunque
        // el valor llegue por otra vía (autocompletado, valores iniciales).
        const payload: ProductOnboardingPayload = {
          nombre: parsed.data.nombre.trim().toUpperCase(),
          tipo: parsed.data.tipo,
          categoria_producto: parsed.data.categoria_producto,
          // El schema ya garantizó un decimal positivo, así que no es `null`.
          precio_base: toSendableDecimal(parsed.data.precio_base, 2) as string,
        };

        const producto = await createProduct(payload);
        setCreatedProduct(producto);
      } catch {
        // Los errores de campo ya se repartieron y el toast salió desde la
        // mutación. Se captura para que el rechazo no escape como unhandled
        // rejection y el formulario siga montado con los avisos visibles.
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // `isSubmitting` cubre el hueco entre el click y el `isPending` de la
  // mutación. Deshabilitar el envío en vuelo MITIGA la carrera del `codigo`
  // consecutivo (doble click = dos altas), no la elimina: dos usuarios
  // distintos pueden seguir coincidiendo; eso lo resuelve el backend.
  const isPending = isSubmitting || isCreating;

  const handleReset = () => {
    form.reset(defaultValues);
    setClientErrors({});
    setServerErrors({});
  };

  /** Vuelve a un formulario vacío para capturar otro producto. */
  const startAnother = () => {
    handleReset();
    setCreatedProduct(null);
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
    isLoadingCatalogs,
    catalogsError,
    missingItems,
    categories,
    productTypes,
    createdProduct,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    startAnother,
    handleFormSubmit,
  };
}
