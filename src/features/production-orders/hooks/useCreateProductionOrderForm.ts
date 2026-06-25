"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import type { FormFieldError } from "@/src/utils/getFieldError";
import { useWorkspaceStore } from "@/src/features/workspace/store/workspace.store";
import { useCreateProductionOrder } from "@/src/features/production-orders/hooks/useCreateProductionOrder";
import {
  CreateProductionOrderFormSchema,
  type CreateProductionOrderFormValues,
} from "@/src/features/production-orders/schemas/create-production-order.schema";

interface UseCreateProductionOrderFormParams {
  /** Prioridad seleccionada en el Paso 1. */
  prioridad: number;
  /** Observaciones generales capturadas en el Paso 1. */
  observaciones: string;
  /** Variantes seleccionadas en el Paso 1 — siembran el detalle por defecto. */
  selectedVariantIds: number[];
  /** Called after the orden de producción is created successfully. */
  onSuccess: () => void;
}

/** Construye un renglón de detalle por defecto para una variante seleccionada. */
function buildDetalle(
  producto_variante_id: number,
): CreateProductionOrderFormValues["orden_produccion_detalle"][number] {
  return {
    producto_variante_id,
    cantidad: 1,
    unidad: 0, // 0 = sin seleccionar; el schema exige una unidad > 0
    observaciones: "",
  };
}

/**
 * useCreateProductionOrderForm
 *
 * Encapsula la lógica de TanStack Form para crear una orden de producción.
 * Sigue la convención del proyecto (ver `useCreateBomForm`): `useForm` con
 * `defaultValues` y validación Zod manual vía `safeParse` en el submit, más
 * los helpers `getError` / `clearError` (indexados por ruta de issue,
 * p. ej. `orden_produccion_detalle.0.unidad`) que consumen los primitivos de
 * formulario compartidos en el Paso 2.
 *
 * `empresa` / `sucursal` provienen del workspace activo; `estatus_op` viaja
 * fijo en `1`. La cabecera (prioridad, observaciones) y el detalle por variante
 * los inyecta el step manager al avanzar desde el Paso 1
 * (`setFieldValue` / {@link seedDetalle}).
 */
export function useCreateProductionOrderForm({
  prioridad,
  observaciones,
  selectedVariantIds,
  onSuccess,
}: UseCreateProductionOrderFormParams) {
  // Empresa y sucursal activas — mismo patrón que el resto de formularios.
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const selectedBranch = useWorkspaceStore((state) => state.selectedBranch);

  const { mutateAsync: createProductionOrder, isPending } =
    useCreateProductionOrder();

  // Errores de validación cliente, indexados por ruta ("a.0.b").
  const [errors, setErrors] = useState<Record<string, string>>({});

  const form = useForm({
    defaultValues: {
      empresa: selectedCompany.id ?? 0,
      sucursal: selectedBranch?.id ?? 0,
      estatus_op: 1,
      prioridad,
      observaciones,
      orden_produccion_detalle: selectedVariantIds.map(buildDetalle),
    } as CreateProductionOrderFormValues,
    onSubmit: async ({ value }) => {
      const parsed = CreateProductionOrderFormSchema.safeParse(value);

      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const key = issue.path.join(".");
          if (!nextErrors[key]) {
            nextErrors[key] = issue.message;
          }
        });
        setErrors(nextErrors);

        // `empresa` / `sucursal` no tienen campo visible en el Paso 2 (vienen
        // del workspace): si fallan, avísalo por toast para no dejar al usuario
        // sin feedback al confirmar.
        const headerError = nextErrors["empresa"] ?? nextErrors["sucursal"];
        if (headerError) {
          toast.error(headerError);
        }
        return;
      }

      setErrors({});

      try {
        await createProductionOrder(parsed.data);
        onSuccess();
      } catch {
        // El toast de error lo maneja la mutación.
      }
    },
  });

  /** Siembra `orden_produccion_detalle` a partir de las variantes elegidas. */
  const seedDetalle = (ids: number[]) => {
    form.setFieldValue("orden_produccion_detalle", ids.map(buildDetalle));
  };

  // Entrega el error de un campo (por ruta) en el shape que esperan los
  // primitivos de formulario compartidos.
  const getError = (path: string): FormFieldError | undefined =>
    errors[path] ? { message: errors[path] } : undefined;

  // Limpia el error de un campo cuando su valor cambia.
  const clearError = (path: string) => {
    setErrors((prev) => {
      if (!(path in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  return {
    form,
    isSubmitting: isPending,
    getError,
    clearError,
    seedDetalle,
  };
}

/** Tipo de la instancia de TanStack Form expuesta por el hook. */
export type CreateProductionOrderFormApi = ReturnType<
  typeof useCreateProductionOrderForm
>["form"];
