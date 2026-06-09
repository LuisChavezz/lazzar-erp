"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useWarehouses } from "@/src/features/warehouses/hooks/useWarehouses";
import { useLocations } from "@/src/features/locations/hooks/useLocations";
import { useProductVariants } from "@/src/features/product-variants/hooks/useProductVariants";
import { getStockItems } from "@/src/features/stock/services/actions";
import { useCreateStockMovement } from "./useCreateStockMovement";
import {
  StockMovementFormSchema,
  type StockMovementFormValues,
} from "../schemas/stock-movement.schema";

type StockMovementField = keyof StockMovementFormValues;

const movimientoTypeOptions: { value: string; label: string }[] = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SALIDA", label: "Salida" },
  { value: "AJUSTE", label: "Ajuste" },
];

export function useStockMovementForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  // ─── Catálogos ──────────────────────────────────────────────────────────
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useWarehouses();
  const { data: locations = [], isLoading: isLoadingLocations } = useLocations();
  const { productVariants = [], isLoading: isLoadingVariants } = useProductVariants();

  const isLoadingFormData = isLoadingWarehouses || isLoadingLocations || isLoadingVariants;

  // ─── Estados de UI ──────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Partial<Record<StockMovementField, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref para evitar doble envío mientras se procesa la mutación.
  const submitInFlight = useRef(false);

  // ─── Stock Check ────────────────────────────────────────────────────────
  const [stockCheckParams, setStockCheckParams] = useState<{
    almacen_id: number;
    producto_variante_id: number;
  } | null>(null);

  const { data: stockCheckResult, isFetching: isCheckingStock } = useQuery({
    queryKey: ["stock-items", "check", stockCheckParams],
    queryFn: () => getStockItems(stockCheckParams ?? undefined),
    enabled: stockCheckParams !== null,
  });

  /** Stock disponible para el almacén + variante seleccionados. */
  const availableStock = stockCheckResult?.[0]?.stock ?? null;

  /** Limpia el resultado de la consulta de existencias. */
  const resetStockCheck = () => {
    setStockCheckParams(null);
  };

  const handleCheckStock = () => {
    const almacenId = form.getFieldValue("almacen_origen_id");
    const varianteId = form.getFieldValue("producto_variante_id");

    if (almacenId < 1 || varianteId < 1) return;

    setStockCheckParams({ almacen_id: almacenId, producto_variante_id: varianteId });
    // Limpiar error previo de stock al consultar de nuevo.
    clearFieldError("cantidad");
  };

  // ─── Opciones derivadas ─────────────────────────────────────────────────

  /** Almacenes activos como opciones del select. */
  const warehouseOptions = useMemo(
    () =>
      warehouses
        .filter((w) => w.estatus === "ACTIVO")
        .map((w) => ({
          value: w.id_almacen,
          label: `${w.codigo} - ${w.nombre}`,
        })),
    [warehouses],
  );

  /** Ubicaciones activas como opciones del select. */
  const activeLocations = useMemo(
    () => locations.filter((l) => l.estatus === "ACTIVO"),
    [locations],
  );

  /** Variantes de producto como opciones del select. */
  const variantOptions = useMemo(
    () =>
      productVariants
        .filter((v) => v.activo)
        .map((v) => ({
          value: v.id,
          label: `${v.sku} - ${v.nombre}`,
        })),
    [productVariants],
  );

  // ─── Prerrequisitos ─────────────────────────────────────────────────────
  const missingItems = useMemo(() => {
    const items: string[] = [];
    if (warehouseOptions.length === 0) items.push("Almacenes activos");
    if (activeLocations.length === 0) items.push("Ubicaciones activas");
    if (variantOptions.length === 0) items.push("Variantes de producto");
    return items;
  }, [warehouseOptions.length, activeLocations.length, variantOptions.length]);

  // ─── Mutación ───────────────────────────────────────────────────────────
  const setHookError = (field: string, error: { message?: string }) => {
    if (!error?.message) return;
    setErrors((prev) => ({ ...prev, [field as StockMovementField]: error.message }));
  };
  const { mutateAsync: createMovement, isPending: isCreating } = useCreateStockMovement(setHookError);

  // ─── Valores iniciales ──────────────────────────────────────────────────
  const defaultValues = useMemo<StockMovementFormValues>(
    () => ({
      tipo_movimiento: "ENTRADA",
      almacen_origen_id: 0,
      ubicacion_origen_id: 0,
      producto_variante_id: 0,
      cantidad: 0,
      observaciones: "",
    }),
    [],
  );

  // ─── Helpers de errores ─────────────────────────────────────────────────
  const getError = (field: StockMovementField): FormFieldError | undefined => {
    const message = errors[field];
    return message ? { message } : undefined;
  };

  const clearFieldError = (field: StockMovementField) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // ─── Validación ─────────────────────────────────────────────────────────
  const validateForm = (values: StockMovementFormValues) => {
    const parsed = StockMovementFormSchema.safeParse(values);
    if (parsed.success) {
      setErrors({});
    } else {
      const nextErrors: Partial<Record<StockMovementField, string>> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as StockMovementField;
        if (!field || nextErrors[field]) return;
        nextErrors[field] = issue.message;
      });
      setErrors(nextErrors);
      return false;
    }

    // Validación extra: SALIDA no puede exceder el stock consultado.
    if (
      values.tipo_movimiento === "SALIDA" &&
      availableStock !== null &&
      values.cantidad > availableStock
    ) {
      setErrors((prev) => ({
        ...prev,
        cantidad: `El stock disponible es ${availableStock}. No puedes mover más de esa cantidad.`,
      }));
      return false;
    }

    return true;
  };

  // ─── Formulario ─────────────────────────────────────────────────────────
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      // Validar primero — si falla, no se entra en estado de carga.
      if (!validateForm(value)) return;

      // Prevenir doble envío.
      if (submitInFlight.current) return;
      submitInFlight.current = true;
      setIsSubmitting(true);

      try {
        const operationType = value.tipo_movimiento;

        await createMovement({
          operationType,
          data: {
            almacen: value.almacen_origen_id,
            items: [
              {
                producto_variante: value.producto_variante_id,
                cantidad: value.cantidad.toFixed(4),
                ubicacion: value.ubicacion_origen_id,
              },
            ],
          },
        });

        form.reset(defaultValues);
        setErrors({});
        onSuccess?.();
      } catch {
        // El error ya se manejó en onError de la mutación (toast + errores de campo).
        return;
      } finally {
        setIsSubmitting(false);
        submitInFlight.current = false;
      }
    },
  });

  const isPending = isSubmitting || isCreating;

  // ─── Submit handler ─────────────────────────────────────────────────────
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  // ─── Reset ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    form.reset(defaultValues);
    setErrors({});
  };

  return {
    form,
    isPending,
    isLoadingFormData,
    missingItems,
    warehouseOptions,
    activeLocations,
    variantOptions,
    movimientoTypeOptions,
    availableStock,
    isCheckingStock,
    handleCheckStock,
    resetStockCheck,
    getError,
    clearFieldError,
    handleFormSubmit,
    handleReset,
  };
}
