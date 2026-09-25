"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { scrollToFirstValidationError } from "@/src/utils/scrollToFirstValidationError";
import { toSendableDecimal } from "@/src/utils/decimal";
import { useProducts } from "../../products/hooks/useProducts";
import type { Product } from "../../products/interfaces/product.interface";
import { useColors } from "../../colors/hooks/useColors";
import { useSizesByCategory } from "../../sizes/hooks/useSizesByCategory";
import {
  VARIANT_PRODUCT_TYPE_IDS,
  productRequiresTalla,
} from "../../product-variants/constants/variantProductTypes";
import type { SetProductVariantError } from "../../product-variants/hooks/setProductVariantFieldErrors";
import {
  ProductVariantOnboardingFormSchema,
  createEmptyProductVariantOnboardingForm,
  type ProductVariantOnboardingFormField,
  type ProductVariantOnboardingFormValues,
} from "../schemas/product-variant-onboarding.schema";
import type {
  ProductVariantOnboardingPayload,
  ProductVariantOnboardingResult,
} from "../interfaces/product-variant-onboarding.interface";
import { buildSkuPreview } from "../utils/buildSkuPreview";
import { useCreateProductVariantOnboarding } from "./useCreateProductVariantOnboarding";

const TALLA_REQUIRED_MESSAGE = "La talla es requerida";

/** Regla condicional de talla (EC-252): solo obligatoria para productos PT. */
const validateTalla = (talla: number, requiresTalla: boolean): string | undefined =>
  requiresTalla && !(talla >= 1) ? TALLA_REQUIRED_MESSAGE : undefined;

type FieldErrors = Partial<Record<ProductVariantOnboardingFormField, string>>;

const isFormField = (field: string): field is ProductVariantOnboardingFormField =>
  field in ProductVariantOnboardingFormSchema.shape;

/**
 * Formulario de alta rápida de variante.
 *
 * Mismo esquema que `useProductOnboardingForm`: errores de cliente y de
 * servidor separados (gana el del servidor) y, tras el 201, se guarda la
 * variante creada para mostrar el SKU real que asignó el backend.
 *
 * Catálogos reutilizados: productos PT + COMPRAS (`useProducts` con
 * `VARIANT_PRODUCT_TYPE_IDS`, activos), colores y tallas por categoría del
 * producto (`useSizesByCategory`). Los productos sin `codigo` NO se filtran: si
 * se elige uno, el backend responde su 400 bajo `producto`.
 *
 * Los errores de `sku` (SKU duplicado o demasiado largo) no tienen input propio:
 * van a `generalError`, que la UI pinta sobre los botones.
 */
export function useProductVariantOnboardingForm() {
  const {
    products,
    isLoading: isLoadingProducts,
    isInitialError: isProductsError,
    error: productsError,
  } = useProducts(VARIANT_PRODUCT_TYPE_IDS);
  const { colors, isLoading: isLoadingColors, isInitialError: isColorsError, error: colorsError } =
    useColors();

  const activeProducts = products.filter((product) => product.activo);

  const findProduct = (productId: number): Product | undefined =>
    activeProducts.find((product) => product.id === productId);

  const formRef = useRef<HTMLFormElement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdVariant, setCreatedVariant] = useState<ProductVariantOnboardingResult | null>(null);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [defaultValues] = useState<ProductVariantOnboardingFormValues>(
    createEmptyProductVariantOnboardingForm,
  );

  const catalogsError = isProductsError ? productsError : isColorsError ? colorsError : null;

  // Solo se reporta un catálogo como faltante cuando cargó bien y vino vacío.
  const missingItems = [
    !isLoadingProducts && !isProductsError && activeProducts.length === 0 ? "Productos" : null,
    !isLoadingColors && !isColorsError && colors.length === 0 ? "Colores" : null,
  ].filter((item): item is string => Boolean(item));

  // El normalizador compartido reporta campos del formulario de variantes de
  // config; aquí `sku` no tiene input, así que se desvía al aviso general.
  const setHookError: SetProductVariantError = (field, error) => {
    if (!error.message) return;
    if (isFormField(field)) {
      setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
      return;
    }
    setGeneralError(error.message);
  };

  const { mutateAsync: createVariant, isPending: isCreating } =
    useCreateProductVariantOnboarding(setHookError);

  /** Editar un campo retira su aviso, venga del cliente o del servidor. */
  const clearFieldErrors = (field: ProductVariantOnboardingFormField) => {
    const drop = (prev: FieldErrors) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    };
    setClientErrors(drop);
    setServerErrors(drop);
    setGeneralError(null);
  };

  /** Valida UN campo (en blur); la talla además depende del producto elegido. */
  const validateField = (
    field: ProductVariantOnboardingFormField,
    value: ProductVariantOnboardingFormValues[ProductVariantOnboardingFormField],
  ) => {
    const parsed = ProductVariantOnboardingFormSchema.shape[field].safeParse(value);
    const conditionalMessage =
      field === "talla" && parsed.success
        ? validateTalla(Number(value), productRequiresTalla(findProduct(form.state.values.producto)))
        : undefined;

    if (parsed.success && !conditionalMessage) {
      setClientErrors((prev) => {
        if (!(field in prev)) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return true;
    }
    const message =
      conditionalMessage ??
      (!parsed.success ? parsed.error.issues[0]?.message : undefined) ??
      "Valor inválido";
    setClientErrors((prev) => ({ ...prev, [field]: message }));
    return false;
  };

  const getError = (field: ProductVariantOnboardingFormField): FormFieldError | undefined => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? { message } : undefined;
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});
      setGeneralError(null);

      const requiresTalla = productRequiresTalla(findProduct(value.producto));
      const parsed = ProductVariantOnboardingFormSchema.safeParse(value);
      const nextErrors: FieldErrors = {};
      if (!parsed.success) {
        parsed.error.issues.forEach((issue) => {
          const field = issue.path[0] as ProductVariantOnboardingFormField;
          if (!field || nextErrors[field]) return;
          nextErrors[field] = issue.message;
        });
      }
      const tallaMessage = validateTalla(value.talla, requiresTalla);
      if (tallaMessage && !nextErrors.talla) nextErrors.talla = tallaMessage;

      setClientErrors(nextErrors);
      if (!parsed.success || Object.keys(nextErrors).length > 0) {
        scrollToFirstValidationError(formRef.current, Object.keys(nextErrors));
        return;
      }

      setIsSubmitting(true);
      try {
        // Exactamente los cuatro campos del serializer; nada de `sku` (lo
        // genera el backend), `nombre`, `empresa` ni `activo`.
        const payload: ProductVariantOnboardingPayload = {
          producto: parsed.data.producto,
          color: parsed.data.color,
          talla: requiresTalla ? parsed.data.talla : null,
          // El schema ya garantizó un decimal positivo, así que no es `null`.
          precio_base: toSendableDecimal(parsed.data.precio_base, 2) as string,
        };

        const variante = await createVariant(payload);
        setCreatedVariant(variante);
      } catch {
        // Errores ya repartidos por campo/aviso general y toast desde la
        // mutación. Se captura para que el rechazo no escape y el formulario
        // siga montado con los avisos visibles.
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Selección EN VIVO: decide si se muestra/exige la talla, de qué categoría
  // salen sus opciones y la vista previa del SKU.
  const selectedProductId = useStore(form.store, (state) => state.values.producto);
  const selectedColorId = useStore(form.store, (state) => state.values.color);
  const selectedTallaId = useStore(form.store, (state) => state.values.talla);

  const selectedProduct = findProduct(selectedProductId);
  const requiresTalla = productRequiresTalla(selectedProduct);
  // `categoria_producto` es nullable en el modelo aunque la interfaz no lo
  // declare: sin categoría se piden todas las tallas.
  const { sizes: sizeOptions, isLoading: isLoadingSizes } = useSizesByCategory({
    categoriaProductoId: selectedProduct?.categoria_producto ?? null,
    enabled: requiresTalla,
  });

  const skuPreview = buildSkuPreview({
    productCode: selectedProduct?.codigo,
    colorCode: colors.find((color) => color.id === selectedColorId)?.codigo,
    tallaName: requiresTalla
      ? sizeOptions.find((size) => size.id === selectedTallaId)?.nombre
      : undefined,
  });
  // Un PT sin talla elegida aún no tiene SKU completo que mostrar.
  const isSkuPreviewComplete = skuPreview !== null && (!requiresTalla || selectedTallaId >= 1);

  /** Cambiar de producto invalida la talla elegida (otra categoría u otro tipo). */
  const resetTalla = () => {
    form.setFieldValue("talla", 0);
    clearFieldErrors("talla");
  };

  /**
   * Confirmación del selector de producto. Reconfirmar el MISMO producto no
   * toca nada: ni la talla capturada ni los avisos.
   */
  const handleProductSelect = (productId: number) => {
    if (productId === form.state.values.producto) return;
    form.setFieldValue("producto", productId);
    clearFieldErrors("producto");
    resetTalla();
  };

  /** Etiqueta del producto elegido: `nombre (codigo)`, o solo el nombre sin código. */
  const getProductLabel = (productId: number): string | null => {
    if (productId <= 0) return null;
    const product = findProduct(productId);
    if (!product) return `#${productId}`;
    return product.codigo ? `${product.nombre} (${product.codigo})` : product.nombre;
  };

  // `isSubmitting` cubre el hueco entre el click y el `isPending` de la
  // mutación. Deshabilitar el envío en vuelo MITIGA la carrera del SKU (doble
  // click = dos altas), no la elimina: el backend no es atómico en ese punto.
  const isPending = isSubmitting || isCreating;

  const handleReset = () => {
    form.reset(defaultValues);
    setClientErrors({});
    setServerErrors({});
    setGeneralError(null);
  };

  /** Vuelve a un formulario vacío para capturar otra variante. */
  const startAnother = () => {
    handleReset();
    setCreatedVariant(null);
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
    isLoadingCatalogs: isLoadingProducts || isLoadingColors,
    catalogsError,
    missingItems,
    activeProducts,
    colors,
    requiresTalla,
    sizeOptions,
    isLoadingSizes,
    skuPreview: isSkuPreviewComplete ? skuPreview : null,
    selectedProductHasCode: Boolean(selectedProduct?.codigo),
    selectedProductId,
    createdVariant,
    generalError,
    getError,
    clearFieldErrors,
    validateField,
    handleProductSelect,
    getProductLabel,
    handleReset,
    startAnother,
    handleFormSubmit,
  };
}
