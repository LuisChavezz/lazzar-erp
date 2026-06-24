"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
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
  /** Pedido de ventas asociado (opcional) seleccionado en el Paso 1. */
  pedido: number | null;
  /** Observaciones generales capturadas en el Paso 1. */
  observaciones: string;
  /** Variantes seleccionadas en el Paso 1 — un renglón de detalle cada una. */
  variantIds: number[];
  /** Called after the orden de producción is created successfully. */
  onSuccess: () => void;
}

/**
 * useCreateProductionOrderForm
 *
 * Encapsula la lógica de TanStack Form para crear una orden de producción.
 * Sigue la convención del proyecto (ver `useCreateBomForm`): `useForm` con
 * `defaultValues`, validación Zod manual vía `safeParse` en el submit y un
 * helper `getError` que devuelve un {@link FormFieldError} para las primitivas
 * de formulario compartidas.
 *
 * Los errores de validación se indexan por la ruta del issue de Zod unida con
 * "." — p. ej. `orden_produccion_detalle.0.bom` — para que cada campo por
 * renglón localice su propio error.
 *
 * `empresa`/`sucursal` provienen del workspace activo; `estatus_op` viaja fijo
 * en `1` y `ruta_produccion` en `null` (ninguno se edita desde la UI).
 */
export function useCreateProductionOrderForm({
  prioridad,
  pedido,
  observaciones,
  variantIds,
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
      pedido,
      ruta_produccion: null,
      estatus_op: 1,
      prioridad,
      observaciones,
      orden_produccion_detalle: variantIds.map((producto_variante_id) => ({
        bom: 0,
        cantidad: 1,
        unidad: 0,
        observaciones: "",
        producto_variante_id,
      })),
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

  // Entrega el error de un campo (por ruta) en el shape que esperan los
  // componentes de formulario compartidos.
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

  // Delega el submit del <form> en TanStack Form.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    isSubmitting: isPending,
    getError,
    clearError,
    handleFormSubmit,
  };
}
