"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "../../../utils/getFieldError";
import { ProductVariantFormSchema, ProductVariantFormValues } from "../schemas/product-variant.schema";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useProducts } from "../../products/hooks/useProducts";
import { useProduct } from "../../products/hooks/useProduct";
import { useColors } from "../../colors/hooks/useColors";
import { useSizesByCategory } from "../../sizes/hooks/useSizesByCategory";
import { useCreateProductVariant } from "./useCreateProductVariant";
import { useUpdateProductVariant } from "./useUpdateProductVariant";
import { ProductVariant } from "../interfaces/product-variant.interface";
import type { Product } from "../../products/interfaces/product.interface";
import {
  VARIANT_PRODUCT_TYPE_IDS,
  productRequiresTalla,
} from "../constants/variantProductTypes";

const TALLA_REQUIRED_MESSAGE = "La talla es requerida";
const PRODUCT_LOADING_MESSAGE =
  "Aún se está cargando la información del producto. Intenta de nuevo en un momento.";
const PRODUCT_LOAD_ERROR_MESSAGE =
  "No se pudo cargar la información del producto. Elige otro o intenta de nuevo.";

/** Regla condicional de talla (EC-252): solo obligatoria para productos PT. */
const validateTalla = (talla: number, requiresTalla: boolean): string | undefined =>
  requiresTalla && !(talla >= 1) ? TALLA_REQUIRED_MESSAGE : undefined;

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
  // EC-249: productos PT y COMPRAS en UNA consulta (`?tipo_id=1,3`). Su llave
  // (`["products", [1, 3]]`) no choca con los listados solo-PT (`["products", 3]`).
  const { products, isLoading: isLoadingProducts } = useProducts(VARIANT_PRODUCT_TYPE_IDS);
  const { colors, isLoading: isLoadingColors } = useColors();

  // Mantiene los mismos criterios de disponibilidad del formulario original.
  const activeProducts = useMemo(() => products.filter((product) => product.activo), [products]);
  const activeColors = colors;

  // Detecta si el formulario está en modo edición.
  const isEditing = Boolean(productVariantToEdit?.id);

  // En edición se conserva el producto ACTUAL de la variante aunque no esté en
  // el catálogo del selector (inactivo, o de un tipo fuera de PT/COMPRAS como
  // los MP de los BOM): el selector solo sirve para CAMBIARLO. Su tipo y su
  // categoría —que deciden la talla— salen del detalle del producto, que solo
  // se pide en ese caso.
  const editProductId = productVariantToEdit?.producto ?? 0;
  const isEditProductListed = activeProducts.some((product) => product.id === editProductId);
  const { product: editProduct, isError: isEditProductError } = useProduct(editProductId, {
    enabled: !isLoadingProducts && !isEditProductListed,
  });

  const findProduct = (productId: number): Product | undefined =>
    activeProducts.find((product) => product.id === productId) ??
    (editProduct?.id === productId ? editProduct : undefined);

  // Define los prerequisitos de catálogos para habilitar el formulario. Las
  // tallas ya no son prerequisito global: solo las necesita un producto PT y se
  // cargan por su categoría (un producto COMPRAS se registra sin talla). Sin
  // productos en el catálogo se puede editar igual: la variante ya tiene el suyo.
  const missingItems = useMemo(
    () =>
      [
        activeProducts.length === 0 && !isLoadingProducts && !isEditing ? "Productos" : null,
        activeColors.length === 0 && !isLoadingColors ? "Colores" : null,
      ].filter((item): item is string => Boolean(item)),
    [activeColors.length, activeProducts.length, isEditing, isLoadingColors, isLoadingProducts]
  );

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

  // Normaliza valores de edición para evitar IDs no disponibles. El producto se
  // conserva SIEMPRE (ver `editProductId`), aunque no esté en el catálogo.
  const editValues = useMemo<ProductVariantFormValues>(() => {
    if (!productVariantToEdit) {
      return emptyValues;
    }

    const hasColor = activeColors.some((color) => color.id === productVariantToEdit.color);

    return {
      producto: productVariantToEdit.producto,
      color: hasColor ? productVariantToEdit.color : 0,
      // Se conserva tal cual (o `0` si la variante no tiene talla). Las opciones
      // salen de la categoría del producto; si esta talla ya no está permitida,
      // el backend lo rechaza con su 400 de `talla`.
      talla: productVariantToEdit.talla ?? 0,
      sku: productVariantToEdit.sku,
      precio_base: productVariantToEdit.precio_base,
      activo: productVariantToEdit.activo,
    };
  }, [activeColors, emptyValues, productVariantToEdit]);

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
    // La talla además depende del producto elegido (regla condicional).
    const conditionalMessage =
      field === "talla" && parsed.success
        ? validateTalla(Number(value), productRequiresTalla(findProduct(form.state.values.producto)))
        : undefined;

    if (parsed.success && !conditionalMessage) {
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

    const message =
      conditionalMessage ?? (!parsed.success ? parsed.error.issues[0]?.message : undefined) ?? "Valor inválido";
    setClientErrors((prev) => ({ ...prev, [field]: message }));
    return false;
  };

  // Valida el formulario completo antes de intentar la mutación.
  const validateForm = (values: ProductVariantFormValues, requiresTalla: boolean) => {
    const parsed = ProductVariantFormSchema.safeParse(values);
    const nextErrors: Partial<Record<ProductVariantFormField, string>> = {};

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as ProductVariantFormField;
        if (!field || nextErrors[field]) {
          return;
        }
        nextErrors[field] = issue.message;
      });
    }

    const tallaMessage = validateTalla(values.talla, requiresTalla);
    if (tallaMessage && !nextErrors.talla) {
      nextErrors.talla = tallaMessage;
    }

    setClientErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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

      const productToSave = findProduct(value.producto);
      const requiresTalla = productRequiresTalla(productToSave);
      if (!validateForm(value, requiresTalla)) {
        return;
      }

      // Sin el producto resuelto no se sabe si exige talla: enviar así mandaría
      // `talla: null` y borraría la de una variante PT. Solo ocurre con el
      // producto actual de una edición mientras su detalle carga o si falló.
      if (!productToSave) {
        const isLoadingEditProduct = value.producto === editProductId && !isEditProductError;
        setClientErrors({
          producto: isLoadingEditProduct ? PRODUCT_LOADING_MESSAGE : PRODUCT_LOAD_ERROR_MESSAGE,
        });
        return;
      }

      // Sin talla para productos que no son PT: se envía `null` explícito (el
      // backend lo acepta para cualquier tipo), también en edición, para no
      // arrastrar una talla que el formulario ya no muestra.
      const payloadValues = {
        ...value,
        talla: requiresTalla ? value.talla : null,
      };

      try {
        if (isEditing && productVariantToEdit) {
          await updateProductVariant({
            id: productVariantToEdit.id,
            empresa: productVariantToEdit.empresa ?? selectedCompany.id!,
            ...payloadValues,
          });
          form.reset(editValues);
          onSuccess();
          return;
        }

        await createProductVariant({
          empresa: selectedCompany.id!,
          ...payloadValues,
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

  // Producto elegido EN VIVO: decide si se muestra/exige la talla y de qué
  // categoría salen sus opciones.
  const selectedProductId = useStore(form.store, (state) => state.values.producto);
  const selectedProduct = findProduct(selectedProductId);
  const requiresTalla = productRequiresTalla(selectedProduct);
  // `categoria_producto` es nullable en el modelo aunque la interfaz no lo
  // declare: sin categoría se piden todas las tallas.
  const { sizes: sizeOptions, isLoading: isLoadingSizes } = useSizesByCategory({
    categoriaProductoId: selectedProduct?.categoria_producto ?? null,
    enabled: requiresTalla,
  });

  /** Cambiar de producto invalida la talla elegida (otra categoría, otro tipo). */
  const resetTalla = () => {
    form.setFieldValue("talla", 0);
    clearFieldErrors("talla");
  };

  /**
   * Confirmación del selector de producto. Reconfirmar el MISMO producto no
   * toca nada: ni la talla capturada ni el aviso del campo.
   */
  const handleProductSelect = (productId: number) => {
    if (productId === form.state.values.producto) {
      return;
    }
    form.setFieldValue("producto", productId);
    clearFieldErrors("producto");
    resetTalla();
  };

  /**
   * Etiqueta del producto elegido. Mientras el detalle del producto actual de
   * una edición carga (o si falló) se usa el nombre que ya trae la variante.
   */
  const getProductLabel = (productId: number): string | null => {
    if (productId <= 0) {
      return null;
    }
    const product = findProduct(productId);
    if (product) {
      return product.nombre;
    }
    if (productId === editProductId && productVariantToEdit?.producto_nombre) {
      return productVariantToEdit.producto_nombre;
    }
    return `#${productId}`;
  };

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
    selectedProductId,
    getProductLabel,
    handleProductSelect,
    requiresTalla,
    sizeOptions,
    isLoadingSizes,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
