"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "../../../utils/getFieldError";
import {
  createProductEditSchema,
  ProductFormValues,
  ProductRequiredFields,
} from "../schemas/product.schema";
import { useProductCategories } from "../../product-categories/hooks/useProductCategories";
import { useUnitsOfMeasure } from "../../units-of-measure/hooks/useUnitsOfMeasure";
import { useTaxes } from "../../taxes/hooks/useTaxes";
import { useSatUnitCodes } from "../../sat-unit-codes/hooks/useSatUnitCodes";
import { useProductTypes } from "../../product-types/hooks/useProductTypes";
import { useSatProdServCodes } from "../../sat-prodserv-codes/hooks/useSatProdServCodes";
import { useUpdateProduct } from "./useUpdateProduct";
import { Product, ProductUpdate } from "../interfaces/product.interface";

interface UseProductFormParams {
  onSuccess: () => void;
  product: Product;
}

// `0` es "sin seleccionar" en los `<select>`; al backend viaja como `null`.
const toCatalogId = (id: number) => (id > 0 ? id : null);

type ProductFormField = keyof ProductFormValues;

// Busca el primer campo inválido en orden visual y mueve el viewport al lugar correcto.
const scrollToFirstValidationError = (formElement: HTMLFormElement, issuePaths: string[]) => {
  if (issuePaths.length === 0) {
    return;
  }

  const normalizedIssuePaths = issuePaths.filter(Boolean);
  const controls = Array.from(formElement.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"))
    .filter((element) => Boolean(element.name) && !element.disabled && !(element instanceof HTMLInputElement && element.type === "hidden"));

  const firstInvalidControl = controls.find((control) =>
    normalizedIssuePaths.some((path) => path === control.name || path.startsWith(`${control.name}.`) || control.name.startsWith(`${path}.`))
  );

  if (firstInvalidControl) {
    firstInvalidControl.scrollIntoView({ behavior: "smooth", block: "center" });
    firstInvalidControl.focus({ preventScroll: true });
    return;
  }
};

/**
 * Formulario de EDICIÓN de producto. No hay modo alta: los productos se crean
 * solo por el alta rápida (`product-onboarding`), que asigna el `codigo`.
 */
export function useProductForm({ onSuccess, product }: UseProductFormParams) {
  // Carga catálogos requeridos para los selectores del formulario.
  const {
    categories,
    isLoading: isLoadingProductCategories,
    isInitialError: isProductCategoriesError,
    error: productCategoriesError,
  } = useProductCategories();
  const { units, isLoading: isLoadingUnits, isInitialError: isUnitsError, error: unitsError } =
    useUnitsOfMeasure();
  const { taxes, isLoading: isLoadingTaxes, isInitialError: isTaxesError, error: taxesError } = useTaxes();
  const {
    satProdservCodes,
    isLoading: isLoadingSatProdservCodes,
    isInitialError: isSatProdservCodesError,
    error: satProdservCodesError,
  } = useSatProdServCodes();
  const {
    satUnitCodes,
    isLoading: isLoadingSatUnitCodes,
    isInitialError: isSatUnitCodesError,
    error: satUnitCodesError,
  } = useSatUnitCodes();
  // Solo para MOSTRAR el nombre del tipo (la respuesta del producto trae el
  // PK, no el `codigo`). Por eso no entra en `catalogs`: si falla o viene
  // vacío, la edición sigue y el tipo se muestra degradado.
  const { productTypes, isLoading: isLoadingProductTypes } = useProductTypes();

  const formRef = useRef<HTMLFormElement | null>(null);

  // Separa errores de validación local y errores devueltos por backend.
  const [clientErrors, setClientErrors] = useState<Partial<Record<ProductFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<ProductFormField, string>>>({});

  // Obligatoriedad de los campos condicionales: se lee del registro recibido
  // (el que había al abrir el formulario), no de lo que se va tecleando, así que
  // un campo que ya tenía valor no se puede vaciar y uno vacío no se exige.
  const requiredFields: ProductRequiredFields = {
    descripcion: Boolean(product.descripcion?.trim()),
    unidad_medida: product.unidad_medida !== null,
    impuesto: product.impuesto !== null,
    sat_prodserv: product.sat_prodserv !== null,
    sat_unidad: product.sat_unidad !== null,
  };
  const productSchema = createProductEditSchema(requiredFields);

  // `tipo` es de solo lectura: se fija en el alta rápida y no viaja en el PUT.
  // Sin tipo, "—"; sin catálogo (cargando, error o id desconocido), el PK.
  const productTypeLabel =
    product.tipo === null
      ? "—"
      : (productTypes.find((type) => type.id === product.tipo)?.codigo ??
        (isLoadingProductTypes ? "Cargando..." : `#${product.tipo}`));

  // Normaliza valores de edición para evitar IDs inexistentes en catálogos no cargados.
  const editValues = useMemo<ProductFormValues>(() => {
    const hasCategory = categories.some((category) => category.id === product.categoria_producto);
    const hasUnit = units.some((unit) => unit.id === product.unidad_medida);
    const hasTax = taxes.some((tax) => tax.id === product.impuesto);
    const hasSatProdserv = satProdservCodes.some(
      (code) => code.id_sat_prodserv === product.sat_prodserv
    );
    const hasSatUnit = satUnitCodes.some((code) => code.id_sat_unidad === product.sat_unidad);

    return {
      nombre: product.nombre,
      descripcion: product.descripcion ?? "",
      categoria_producto: hasCategory ? product.categoria_producto : 0,
      unidad_medida: hasUnit ? (product.unidad_medida ?? 0) : 0,
      impuesto: hasTax ? (product.impuesto ?? 0) : 0,
      sat_prodserv: hasSatProdserv ? (product.sat_prodserv ?? 0) : 0,
      sat_unidad: hasSatUnit ? (product.sat_unidad ?? 0) : 0,
      precio_base: parseFloat(product.precio_base) || 0,
      activo: product.activo,
    };
  }, [categories, product, satProdservCodes, satUnitCodes, taxes, units]);

  // Mismo criterio que el alta rápida: un catálogo que falló al cargar se
  // reporta como error, no como faltante (un error de red no significa que no
  // existan registros).
  const catalogs = [
    {
      label: "Categorías de producto",
      count: categories.length,
      isLoading: isLoadingProductCategories,
      isError: isProductCategoriesError,
      error: productCategoriesError,
    },
    {
      label: "Unidades de medida",
      count: units.length,
      isLoading: isLoadingUnits,
      isError: isUnitsError,
      error: unitsError,
    },
    {
      label: "Impuestos",
      count: taxes.length,
      isLoading: isLoadingTaxes,
      isError: isTaxesError,
      error: taxesError,
    },
    {
      label: "Claves SAT Prod/Serv",
      count: satProdservCodes.length,
      isLoading: isLoadingSatProdservCodes,
      isError: isSatProdservCodesError,
      error: satProdservCodesError,
    },
    {
      label: "Claves SAT Unidad",
      count: satUnitCodes.length,
      isLoading: isLoadingSatUnitCodes,
      isError: isSatUnitCodesError,
      error: satUnitCodesError,
    },
  ];
  const catalogsError = catalogs.find((catalog) => catalog.isError)?.error ?? null;
  const missingItems = catalogs
    .filter((catalog) => !catalog.isLoading && !catalog.isError && catalog.count === 0)
    .map((catalog) => catalog.label);

  // Traduce errores de mutaciones al estado interno de errores por campo.
  const setHookError = (field: ProductFormField, error: { message?: string }) => {
    if (!error?.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: updateProduct, isPending } = useUpdateProduct(setHookError);

  // Limpia errores de cliente y servidor al modificar un campo.
  const clearFieldErrors = (field: ProductFormField) => {
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

  // Valida un campo en onBlur usando la regla puntual del schema.
  const validateField = (field: ProductFormField, value: ProductFormValues[ProductFormField]) => {
    const fieldSchema = productSchema.shape[field];
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

  // Valida el formulario completo antes del submit y construye el mapa de errores.
  const validateForm = (values: ProductFormValues) => {
    const parsed = productSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<ProductFormField, string>> = {};
    const issuePaths: string[] = [];

    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as ProductFormField;
      issuePaths.push(String(field));
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });

    setClientErrors(nextErrors);

    if (formRef.current) {
      setTimeout(() => {
        scrollToFirstValidationError(formRef.current!, issuePaths);
      }, 0);
    }

    return false;
  };

  // Prioriza mensajes de backend y mantiene compatibilidad con componentes de error.
  const getError = (field: ProductFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  const form = useForm({
    defaultValues: editValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      // Campos explícitos, sin `...value`: sin `tipo` (el backend conserva el
      // guardado, ver `ProductUpdate`) y los catálogos sin seleccionar viajan
      // como `null` (el backend los admite vacíos).
      const payload: ProductUpdate = {
        nombre: value.nombre,
        descripcion: value.descripcion,
        categoria_producto: value.categoria_producto,
        unidad_medida: toCatalogId(value.unidad_medida),
        impuesto: toCatalogId(value.impuesto),
        sat_prodserv: toCatalogId(value.sat_prodserv),
        sat_unidad: toCatalogId(value.sat_unidad),
        precio_base: value.precio_base,
        activo: value.activo,
      };

      try {
        await updateProduct({ id: product.id, ...payload });
        onSuccess();
      } catch {
        return;
      }
    },
  });

  // Sincroniza el formulario cuando cambian valores derivados de edición.
  useEffect(() => {
    form.reset(editValues);
  }, [editValues, form]);

  // Restablece manualmente el formulario a los valores del producto y limpia errores.
  const handleReset = () => {
    form.reset(editValues);
    setClientErrors({});
    setServerErrors({});
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // Encapsula submit del DOM y delega ejecución al formulario.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // Define key estable para remount entre productos.
  const formKey = `product-edit-${product.id}`;

  return {
    form,
    formRef,
    formKey,
    isPending,
    catalogsError,
    missingItems,
    categories,
    units,
    taxes,
    satProdservCodes,
    satUnitCodes,
    productTypeLabel,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
