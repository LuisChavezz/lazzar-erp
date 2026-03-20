"use client";

import { useForm } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "../../../utils/getFieldError";
import { ProductFormSchema, ProductFormValues } from "../schemas/product.schema";
import { useProductCategories } from "../../product-categories/hooks/useProductCategories";
import { useUnitsOfMeasure } from "../../units-of-measure/hooks/useUnitsOfMeasure";
import { useTaxes } from "../../taxes/hooks/useTaxes";
import { useSatUnitCodes } from "../../sat-unit-codes/hooks/useSatUnitCodes";
import { useProductTypes } from "../../product-types/hooks/useProductTypes";
import { useSatProdServCodes } from "../../sat-prodserv-codes/hooks/useSatProdServCodes";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCreateProduct } from "./useCreateProduct";
import { useUpdateProduct } from "./useUpdateProduct";
import { Product } from "../interfaces/product.interface";

interface UseProductFormParams {
  onSuccess: () => void;
  productToEdit?: Product | null;
}

type ProductFormField = keyof ProductFormValues;

export function useProductForm({ onSuccess, productToEdit }: UseProductFormParams) {
  // Obtiene la empresa activa para construir payloads de creación y edición.
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);

  // Carga catálogos requeridos para los selectores del formulario.
  const { categories, isLoading: isLoadingProductCategories } = useProductCategories();
  const { units, isLoading: isLoadingUnits } = useUnitsOfMeasure();
  const { taxes, isLoading: isLoadingTaxes } = useTaxes();
  const { satProdservCodes, isLoading: isLoadingSatProdservCodes } = useSatProdServCodes();
  const { satUnitCodes, isLoading: isLoadingSatUnitCodes } = useSatUnitCodes();
  const { productTypes, isLoading: isLoadingProductTypes } = useProductTypes();

  // Detecta modo edición en función de la entidad recibida.
  const isEditing = Boolean(productToEdit?.id);

  // Mantiene estado de referencia del formulario y preferencias de captura continua.
  const formRef = useRef<HTMLFormElement | null>(null);
  const [keepCreating, setKeepCreating] = useState(false);

  // Separa errores de validación local y errores devueltos por backend.
  const [clientErrors, setClientErrors] = useState<Partial<Record<ProductFormField, string>>>({});
  const [serverErrors, setServerErrors] = useState<Partial<Record<ProductFormField, string>>>({});

  // Define los valores base para modo creación.
  const emptyValues = useMemo<ProductFormValues>(
    () => ({
      nombre: "",
      descripcion: "",
      tipo: "",
      categoria_producto: 0,
      unidad_medida: 0,
      impuesto: 0,
      sat_prodserv: 0,
      sat_unidad: 0,
      activo: true,
    }),
    []
  );

  // Normaliza valores de edición para evitar IDs inexistentes en catálogos no cargados.
  const editValues = useMemo<ProductFormValues>(() => {
    if (!productToEdit) {
      return emptyValues;
    }

    const hasCategory = categories.some((category) => category.id === productToEdit.categoria_producto);
    const productTypeCode = productToEdit.tipo ?? "";
    const hasType = productTypes.some((type) => type.codigo === productTypeCode);
    const hasUnit = units.some((unit) => unit.id === productToEdit.unidad_medida);
    const hasTax = taxes.some((tax) => tax.id === productToEdit.impuesto);
    const hasSatProdserv = satProdservCodes.some(
      (code) => code.id_sat_prodserv === productToEdit.sat_prodserv
    );
    const hasSatUnit = satUnitCodes.some((code) => code.id_sat_unidad === productToEdit.sat_unidad);

    return {
      nombre: productToEdit.nombre,
      descripcion: productToEdit.descripcion,
      tipo: hasType ? productTypeCode : "",
      categoria_producto: hasCategory ? productToEdit.categoria_producto : 0,
      unidad_medida: hasUnit ? productToEdit.unidad_medida : 0,
      impuesto: hasTax ? productToEdit.impuesto : 0,
      sat_prodserv: hasSatProdserv ? productToEdit.sat_prodserv : 0,
      sat_unidad: hasSatUnit ? productToEdit.sat_unidad : 0,
      activo: productToEdit.activo,
    };
  }, [categories, emptyValues, productToEdit, productTypes, satProdservCodes, satUnitCodes, taxes, units]);

  // Expone faltantes de catálogos para bloquear el formulario cuando no hay prerequisitos.
  const missingItems = useMemo(
    () =>
      [
        categories.length === 0 && !isLoadingProductCategories ? "Categorías de producto" : null,
        productTypes.length === 0 && !isLoadingProductTypes ? "Tipos de producto" : null,
        units.length === 0 && !isLoadingUnits ? "Unidades de medida" : null,
        taxes.length === 0 && !isLoadingTaxes ? "Impuestos" : null,
        satProdservCodes.length === 0 && !isLoadingSatProdservCodes ? "Claves SAT Prod/Serv" : null,
        satUnitCodes.length === 0 && !isLoadingSatUnitCodes ? "Claves SAT Unidad" : null,
      ].filter((item): item is string => Boolean(item)),
    [
      categories.length,
      isLoadingProductCategories,
      isLoadingProductTypes,
      isLoadingSatProdservCodes,
      isLoadingSatUnitCodes,
      isLoadingTaxes,
      isLoadingUnits,
      productTypes.length,
      satProdservCodes.length,
      satUnitCodes.length,
      taxes.length,
      units.length,
    ]
  );

  // Traduce errores de mutaciones al estado interno de errores por campo.
  const setHookError = (field: ProductFormField, error: { message?: string }) => {
    if (!error?.message) {
      return;
    }
    setServerErrors((prev) => ({ ...prev, [field]: error.message as string }));
  };

  const { mutateAsync: createProduct, isPending: isCreating } = useCreateProduct(setHookError);
  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProduct(setHookError);

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
    const fieldSchema = ProductFormSchema.shape[field];
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
    const parsed = ProductFormSchema.safeParse(values);
    if (parsed.success) {
      setClientErrors({});
      return true;
    }

    const nextErrors: Partial<Record<ProductFormField, string>> = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as ProductFormField;
      if (!field || nextErrors[field]) {
        return;
      }
      nextErrors[field] = issue.message;
    });
    setClientErrors(nextErrors);
    return false;
  };

  // Prioriza mensajes de backend y mantiene compatibilidad con componentes de error.
  const getError = (field: ProductFormField) => {
    const message = serverErrors[field] ?? clientErrors[field];
    return message ? ({ message } as FormFieldError) : undefined;
  };

  // Centraliza estado y flujo de submit para crear/editar manteniendo el comportamiento actual.
  const form = useForm({
    defaultValues: isEditing ? editValues : emptyValues,
    onSubmit: async ({ value }) => {
      setServerErrors({});

      if (!validateForm(value)) {
        return;
      }

      try {
        if (isEditing && productToEdit) {
          await updateProduct({
            id: productToEdit.id,
            empresa: productToEdit.empresa ?? selectedCompany.id!,
            ...value,
          });
          form.reset(editValues);
          onSuccess();
          return;
        }

        await createProduct({
          empresa: selectedCompany.id!,
          ...value,
        });

        if (keepCreating) {
          form.reset({
            ...value,
            nombre: "",
            descripcion: "",
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

  // Sincroniza el formulario cuando cambian valores derivados de edición.
  useEffect(() => {
    if (!isEditing) {
      return;
    }
    form.reset(editValues);
  }, [editValues, form, isEditing]);

  // Expone estado global de bloqueo para evitar interacción durante mutaciones.
  const isPending = isCreating || isUpdating;

  // Restablece manualmente el formulario según modo y limpia errores.
  const handleReset = () => {
    form.reset(isEditing ? editValues : emptyValues);
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

  // Define key estable para remount entre creación y edición.
  const formKey = isEditing ? `product-edit-${productToEdit?.id ?? "ready"}` : "product-new";

  return {
    form,
    formRef,
    formKey,
    isEditing,
    isPending,
    keepCreating,
    setKeepCreating,
    missingItems,
    categories,
    units,
    taxes,
    satProdservCodes,
    satUnitCodes,
    productTypes,
    getError,
    clearFieldErrors,
    validateField,
    handleReset,
    handleFormSubmit,
  };
}
